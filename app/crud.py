from sqlalchemy.orm import Session
from app.database import Grade
from app.validators import GradeValidator
from typing import Tuple, List, Dict, Any, Optional

# Default validator with range 0-100
default_validator = GradeValidator(min_grade=0, max_grade=100)

def create_grade(
    db: Session, 
    student_id: int, 
    subject: str, 
    grade: int,
    validator: GradeValidator = default_validator
) -> Grade:
    """Create a new grade after validation."""
    # Validate the grade data
    grade_data = {"student_id": student_id, "subject": subject, "grade": grade}
    is_valid, error_message = validator.validate_grade_data(grade_data)
    
    if not is_valid:
        raise ValueError(error_message)
    
    # Create the grade
    new_grade = Grade(
        student_id=int(student_id), 
        subject=str(subject), 
        grade=int(grade)
    )
    db.add(new_grade)
    db.commit()
    db.refresh(new_grade)
    return new_grade

def update_grade(
    db: Session, 
    grade_id: int, 
    new_grade: int,
    validator: GradeValidator = default_validator
) -> Optional[Grade]:
    """Update a grade after validation."""
    # Validate the grade value
    is_valid, error_message = validator.validate_grade(new_grade)
    if not is_valid:
        raise ValueError(error_message)
    
    # Update the grade
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if grade:
        grade.grade = int(new_grade)
        db.commit()
        db.refresh(grade)
    return grade

def get_grades_by_student(db: Session, student_id: int) -> List[Grade]:
    """Get all grades for a student."""
    return db.query(Grade).filter(Grade.student_id == student_id).all()

def delete_grade(db: Session, grade_id: int) -> Optional[Grade]:
    """Delete a grade by ID."""
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if grade:
        db.delete(grade)
        db.commit()
    return grade

def bulk_create_grades(
    db: Session, 
    grades_data: List[Dict[str, Any]],
    validator: GradeValidator = default_validator
) -> Tuple[List[Grade], List[str]]:
    successful_grades = []
    errors = []
    
    # Start a transaction to allow rollback if needed
    try:
        for idx, grade_data in enumerate(grades_data):
            try:
                # Validate the grade data
                is_valid, error_message = validator.validate_grade_data(grade_data)
                if not is_valid:
                    errors.append(f"Row {idx+1}: {error_message}")
                    continue
                    
                # Create grade
                new_grade = Grade(
                    student_id=int(grade_data["student_id"]),
                    subject=str(grade_data["subject"]),
                    grade=int(grade_data["grade"])
                )
                db.add(new_grade)
                successful_grades.append(new_grade)
                
            except Exception as e:
                errors.append(f"Row {idx+1}: {str(e)}")
        
        # Commit all successful grades if there are any
        if successful_grades:
            db.commit()
            for grade in successful_grades:
                db.refresh(grade)
                
        return successful_grades, errors
        
    except Exception as e:
        # If a database-level error occurs, roll back and report it
        db.rollback()
        errors.append(f"Database error: {str(e)}")
        return [], errors