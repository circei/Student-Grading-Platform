from fastapi import FastAPI, HTTPException, Depends, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from passlib.context import CryptContext
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import List
from app.crud import create_grade, get_grades_by_student, update_grade, delete_grade

import firebase_admin
from firebase_admin import credentials, auth

from app.database import init_db, SessionLocal, User as DBUser

# ----------------------------
# Firebase Admin Initialization
# ----------------------------
# Ensure that the path below points to your serviceAccountKey.json file.
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
    username: str
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class GradeBase(BaseModel):
    subject: str
    grade: int

class GradeCreate(GradeBase):
    student_id: int

class GradeUpdate(BaseModel):
    grade: int

class GradeResponse(GradeBase):
    id: int
    student_id: int

    class Config:
        orm_mode = True
        from_attributes = True  # Required for Pydantic v2 to use from_orm


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
            detail="Invalid or expired Firebase token"
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
    created_grade = create_grade(db, student_id=grade.student_id, subject=grade.subject, grade=grade.grade)
    return GradeResponse.from_orm(created_grade)

@app.get("/grades/{student_id}", response_model=List[GradeResponse])
def list_grades(student_id: int, db: Session = Depends(get_db)):
    grades = get_grades_by_student(db, student_id)
    return [GradeResponse.from_orm(grade) for grade in grades]


@app.put("/grades/{grade_id}", response_model=GradeResponse)
def modify_grade(grade_id: int, grade_update: GradeUpdate, db: Session = Depends(get_db)):
    updated_grade = update_grade(db, grade_id, grade_update.grade)
    if not updated_grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    return GradeResponse.from_orm(updated_grade)

@app.delete("/grades/{grade_id}", response_model=GradeResponse)
def remove_grade(grade_id: int, db: Session = Depends(get_db)):
    deleted_grade = delete_grade(db, grade_id)
    if not deleted_grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    return GradeResponse.from_orm(deleted_grade)

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