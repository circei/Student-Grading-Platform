from fastapi import Body, FastAPI, HTTPException, Depends, Path, Query, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, validator, Field
import re
from passlib.context import CryptContext
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import List
from app.crud import create_grade, get_grades_by_student, update_grade, delete_grade, bulk_create_grades
from typing import Optional
from fastapi import UploadFile, File
from fastapi.responses import StreamingResponse
import csv
import io
import os
from typing import Dict, List, Optional
import openpyxl
from tempfile import NamedTemporaryFile
from app.validators import GradeValidator


import firebase_admin
from firebase_admin import credentials, auth

from app.database import init_db, SessionLocal, User as DBUser


def is_excel_file(filename: str) -> bool:
    """Check if the file is an Excel file based on extension."""
    return filename.lower().endswith(('.xlsx', '.xls'))

def parse_excel_file(content: bytes):
    """Parse Excel file content and convert to list of dictionaries."""
    # Create temp file to hold Excel data
    with NamedTemporaryFile(suffix='.xlsx', delete=False) as temp:
        temp_path = temp.name
        temp.write(content)
    
    try:
        # Load Excel workbook
        workbook = openpyxl.load_workbook(temp_path, read_only=True)
        sheet = workbook.active
        
        # Get header row
        headers = [cell.value for cell in next(sheet.rows)]
        
        # Prepare data rows
        data = []
        for row in sheet.iter_rows(min_row=2):  # Skip header row
            row_data = {}
            for header, cell in zip(headers, row):
                row_data[header] = str(cell.value) if cell.value is not None else ""
            data.append(row_data)
        
        return data
    finally:
        # Clean up temp file
        import os
        if os.path.exists(temp_path):
            os.unlink(temp_path)

# ----------------------------
# Firebase Admin Initialization
# ----------------------------
cred = credentials.Certificate("app/cert/serviceAccountKey.json")
firebase_admin.initialize_app(cred)

# ----------------------------
# FastAPI App and Database Setup
# ----------------------------
app = FastAPI()
init_db()  # Create tables if they don't exist

# ----------------------------
# Local Security (for signup password hashing)
# ----------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# For Firebase token extraction from headers.
firebase_scheme = HTTPBearer()

# ----------------------------
# Pydantic Models
# ----------------------------
class User(BaseModel):
    username: str
    email: str

    class Config:
        orm_mode = True  # Enables compatibility with SQLAlchemy models

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr  # Validates email format
    password: str = Field(..., min_length=8)
    
    @validator('username')
    def username_alphanumeric(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Username must contain only letters, numbers, underscores, and hyphens')
        return v
        
    @validator('password')
    def password_strength(cls, v):
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isalpha() for char in v):
            raise ValueError('Password must contain at least one letter')
        return v

class Token(BaseModel):
    access_token: str
    token_type: str

class GradeBase(BaseModel):
    subject: str = Field(..., min_length=1, max_length=100)
    grade: int = Field(..., ge=0, le=100)  # ge=greater or equal, le=less or equal

class GradeCreate(GradeBase):
    student_id: int = Field(..., gt=0)  # gt=greater than 0

class GradeUpdate(BaseModel):
    grade: int = Field(..., ge=0, le=100)

class GradeResponse(GradeBase):
    id: int
    student_id: int

    class Config:
        orm_mode = True
        from_attributes = True

class UserProfileUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)
    
    @validator('password')
    def password_strength(cls, v):
        if v is None:
            return v
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isalpha() for char in v):
            raise ValueError('Password must contain at least one letter')
        return v

class BulkUploadResponse(BaseModel):
    total_processed: int
    successful: int
    failed: int
    errors: Optional[List[str]] = None


# ----------------------------
# Database Dependency
# ----------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ----------------------------
# Utility Functions (Local Password Handling)
# ----------------------------
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# ----------------------------
# Firebase Authentication Dependencies
# ----------------------------
def get_current_firebase_user(token: HTTPAuthorizationCredentials = Depends(firebase_scheme)) -> dict:
    """
    Verifies the Firebase ID token and returns its decoded payload.
    """ 

    try:
        decoded_token = auth.verify_id_token(token.credentials)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Firebase token: {str(e)}"
        )
    
def require_roles(required_roles: List[str]):
    """
    Dependency generator that checks whether the Firebase token includes at least one
    of the required roles (e.g., "admin", "teacher", "student"). It assumes that the
    Firebase custom claims include a "roles" key.
    """
    def role_checker(user: dict = Depends(get_current_firebase_user)) -> dict:
        roles = user.get("roles", [])
        if isinstance(roles, str):
            roles = [roles]
        if not any(role in roles for role in required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return user
    return role_checker

# ----------------------------
# Authentication Endpoints
# ----------------------------

@app.post("/auth/signup", response_model=User)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    # Check if the user already exists locally
    existing_user = db.query(DBUser).filter(DBUser.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create new user locally (storing hashed password for local reference)
    hashed_password = get_password_hash(user.password)
    new_user = DBUser(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# Note: In a Firebase-driven system, the client typically handles authentication.
# For demonstration, the login endpoint below simply verifies the provided Firebase ID token.
@app.post("/auth/login", response_model=Token)
def login(credentials: HTTPAuthorizationCredentials = Depends(firebase_scheme), db: Session = Depends(get_db)):
    try:
        # Verify the Firebase token sent by the client
        decoded_token = auth.verify_id_token(credentials.credentials)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Firebase token")
    # Optionally, you could update the local user record or sync roles.
    return {"access_token": credentials.credentials, "token_type": "Bearer"}

# Dependency to retrieve the current user from Firebase token and match with local DB
def get_current_user(token: HTTPAuthorizationCredentials = Depends(firebase_scheme), db: Session = Depends(get_db)) -> DBUser:
    try:
        decoded_token = auth.verify_id_token(token.credentials)
        username = decoded_token.get("sub")  # Using the 'sub' claim as username
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token: no subject")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Firebase token")
    
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

# ----------------------------
# Protected Endpoints
# ----------------------------
@app.get("/users/me", response_model=User)
def read_users_me(current_user: DBUser = Depends(get_current_user)):
    return current_user

@app.get("/admin/dashboard")
def admin_dashboard(user: dict = Depends(require_roles(["admin"]))):
    return {"message": "Welcome to the admin dashboard!", "user": user}

@app.get("/teacher/portal")
def teacher_portal(user: dict = Depends(require_roles(["teacher"]))):
    return {"message": "Welcome to the teacher portal!", "user": user}

@app.get("/student/area")
def student_area(user: dict = Depends(require_roles(["student"]))):
    return {"message": "Welcome to the student area!", "user": user}

# ----------------------------
# Grades Endpoints
# ----------------------------

@app.post("/grades/", response_model=GradeResponse)
def add_grade(grade: GradeCreate, db: Session = Depends(get_db)):
    try:
        created_grade = create_grade(
            db, 
            student_id=grade.student_id, 
            subject=grade.subject, 
            grade=grade.grade
        )
        return GradeResponse.from_orm(created_grade)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/grades/{student_id}", response_model=List[GradeResponse])
def list_grades(student_id: int = Path(..., gt=0, description="The student ID"), db: Session = Depends(get_db)):
    grades = get_grades_by_student(db, student_id)
    return [GradeResponse.from_orm(grade) for grade in grades]


@app.put("/grades/{grade_id}", response_model=GradeResponse)
def modify_grade(
    grade_id: int = Path(..., gt=0, description="The grade ID"), 
    grade_update: GradeUpdate = Body(...),
    db: Session = Depends(get_db)
):
    try:
        updated_grade = update_grade(db, grade_id, grade_update.grade)
        if not updated_grade:
            raise HTTPException(status_code=404, detail="Grade not found")
        return GradeResponse.from_orm(updated_grade)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/grades/{grade_id}", response_model=GradeResponse)
def remove_grade(grade_id: int = Path(..., gt=0, description="The grade ID"), db: Session = Depends(get_db)):
    deleted_grade = delete_grade(db, grade_id)
    if not deleted_grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    return GradeResponse.from_orm(deleted_grade)

@app.post("/grades/upload", response_model=BulkUploadResponse)
async def upload_grades(
    file: UploadFile = File(...),
    min_grade: int = Field(0, ge=0, le=100),
    max_grade: int = Field(100, ge=0, le=100),
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["admin", "teacher"]))
):
    # Validate file size (10MB limit)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    file_size = 0
    content = bytearray()
    
    # Read file in chunks to validate size
    chunk = await file.read(1024)
    while chunk:
        file_size += len(chunk)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large: maximum size is 10MB"
            )
        content.extend(chunk)
        chunk = await file.read(1024)
    
    # Ensure min_grade <= max_grade
    if min_grade > max_grade:
        raise HTTPException(
            status_code=400,
            detail=f"min_grade ({min_grade}) cannot be greater than max_grade ({max_grade})"
        )
    
    # Create validator with specified range
    validator = GradeValidator(min_grade=min_grade, max_grade=max_grade)
    
    # Read file content
    content = await file.read()
    
    try:
        # Check file type and parse accordingly
        if is_excel_file(file.filename):
            try:
                grades_data = parse_excel_file(content)
            except ImportError:
                raise HTTPException(
                    status_code=400,
                    detail="Excel support requires the openpyxl package. Install with: pip install openpyxl"
                )
        elif file.filename.endswith('.csv'):
            # Parse as CSV
            content_str = content.decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(content_str))
            grades_data = list(csv_reader)
        else:
            raise HTTPException(
                status_code=400, 
                detail="Only CSV and Excel files are supported"
            )
        MAX_ROWS = 1000
        if len(grades_data) > MAX_ROWS:
            raise HTTPException(
                status_code=400,
                detail=f"Too many rows in file: maximum is {MAX_ROWS}, found {len(grades_data)}"
            )
        # Validate required columns
        required_columns = ['student_id', 'subject', 'grade']
        if not grades_data or not all(col in grades_data[0] for col in required_columns):
            raise HTTPException(
                status_code=400,
                detail=f"File must contain these columns: {', '.join(required_columns)}"
            )
        
        # Bulk create grades with specified validator
        successful_grades, errors = bulk_create_grades(db, grades_data, validator=validator)
        
        # Prepare response
        response = {
            "total_processed": len(grades_data),
            "successful": len(successful_grades),
            "failed": len(grades_data) - len(successful_grades),
        }
        
        # Add errors if any
        if errors:
            response["errors"] = errors
            
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@app.get("/grades/upload/template")
async def get_grade_upload_template(
    format: str = Query("csv", pattern="^(csv|excel)$"),
    min_grade: int = Query(0, ge=0, le=100),
    max_grade: int = Query(100, ge=0, le=100),
    _: dict = Depends(require_roles(["admin", "teacher"]))
):
    # Ensure min_grade <= max_grade
    if min_grade > max_grade:
        raise HTTPException(
            status_code=400,
            detail=f"min_grade ({min_grade}) cannot be greater than max_grade ({max_grade})"
        )
    """
    Get a template file for bulk grade upload.
    
    Query parameters:
    - format: "csv" or "excel" (default: "csv")
    - min_grade: Minimum allowed grade (default: 0)
    - max_grade: Maximum allowed grade (default: 100)
    """
    # Sample data
    sample_data = [
        {"student_id": "1", "subject": f"Math (Range: {min_grade}-{max_grade})", "grade": str(min(95, max_grade))},
        {"student_id": "2", "subject": "Science", "grade": str(min(87, max_grade))},
        {"student_id": "3", "subject": "History", "grade": str(min(78, max_grade))}
    ]
    
    # If Excel format is requested
    if format.lower() == "excel":
        try:
            # Create Excel workbook and active sheet
            workbook = openpyxl.Workbook()
            sheet = workbook.active
            
            # Add headers
            headers = ["student_id", "subject", "grade"]
            for col_idx, header in enumerate(headers, 1):
                sheet.cell(row=1, column=col_idx, value=header)
            
            # Add sample data
            for row_idx, data_row in enumerate(sample_data, 2):
                for col_idx, header in enumerate(headers, 1):
                    sheet.cell(row=row_idx, column=col_idx, value=data_row[header])
            
            # Save to temporary file
            with NamedTemporaryFile(delete=False, suffix='.xlsx') as temp:
                temp_path = temp.name
                workbook.save(temp_path)
                
            # Read the file and return it
            with open(temp_path, "rb") as f:
                excel_data = f.read()
                
            # Clean up the temporary file
            import os
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
            return StreamingResponse(
                io.BytesIO(excel_data),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=grade_upload_template.xlsx"}
            )
        except ImportError:
            raise HTTPException(
                status_code=400,
                detail="Excel template requires the openpyxl package. Install with: pip install openpyxl"
            )
    
    # Default to CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(['student_id', 'subject', 'grade'])
    
    # Write sample data
    for row in sample_data:
        writer.writerow([row['student_id'], row['subject'], row['grade']])
    
    # Reset buffer position
    output.seek(0)
    
    # Return CSV file
    return StreamingResponse(
        output, 
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=grade_upload_template.csv"}
    )

# ----------------------------
# User Profile Endpoints
# ----------------------------

# Update profile endpoint
@app.put("/users/me", response_model=User)
def update_profile(
    profile_update: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    """Update the current user's profile."""
    # Check if email is being updated and if it's already taken
    if profile_update.email and profile_update.email != current_user.email:
        existing_user = db.query(DBUser).filter(DBUser.email == profile_update.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = profile_update.email
    
    # Update password if provided
    if profile_update.password:
        current_user.hashed_password = get_password_hash(profile_update.password)
    
    db.commit()
    db.refresh(current_user)
    return current_user

# Admin endpoint to get any user's profile
@app.get("/users/{user_id}", response_model=User)
def get_user_profile(
    user_id: int = Path(..., gt=0, description="The user ID"), 
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["admin"]))
):
    """Get a user's profile by ID (admin only)."""
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Admin endpoint to update any user's profile
@app.put("/users/{user_id}", response_model=User)
def update_user_profile(
    user_id: int = Path(..., gt=0, description="The user ID"),
    profile_update: UserProfileUpdate = Body(...),
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["admin"]))
):
    """Update any user's profile (admin only)."""
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if email is being updated and if it's already taken
    if profile_update.email and profile_update.email != user.email:
        existing_user = db.query(DBUser).filter(DBUser.email == profile_update.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        user.email = profile_update.email
    
    # Update password if provided
    if profile_update.password:
        user.hashed_password = get_password_hash(profile_update.password)
    
    db.commit()
    db.refresh(user)
    return user

# ----------------------------
# HTTPS Entry Point
# ----------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=443,
        ssl_keyfile="app/cert/key.pem",   # Update with the path to your private key file
        ssl_certfile="app/cert/cert.pem",   # Update with the path to your certificate file
        reload=True
    )