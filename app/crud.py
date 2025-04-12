from sqlalchemy.orm import Session
from app.database import Course, Grade, StudentCourse
from app.validators import GradeValidator
from typing import Tuple, List, Dict, Any, Optional
from datetime import datetime
from app.database import Grade, GradeHistory

# Default validator with range 0-100
default_validator = GradeValidator(min_grade=0, max_grade=100)

def create_grade(
    db: Session, 
    student_id: int, 
    subject: str, 
    grade: int,
    validator: GradeValidator = default_validator,
    changed_by: str = None
) -> Grade:
    """Create a new grade after validation and record history."""
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
    
    # Create history entry for new grade
    history_entry = GradeHistory.create_log(
        grade=new_grade,
        old_value=None,
        new_value=grade,
        action="create",
        changed_by=changed_by
    )
    db.add(history_entry)
    db.commit()
    
    return new_grade

def update_grade(
    db: Session, 
    grade_id: int, 
    new_grade: int,
    validator: GradeValidator = default_validator,
    changed_by: str = None
) -> Optional[Grade]:
    """Update a grade after validation and record history."""
    # Validate the grade value
    is_valid, error_message = validator.validate_grade(new_grade)
    if not is_valid:
        raise ValueError(error_message)
    
    # Get the grade to update
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if grade:
        # Store old value for history
        old_value = grade.grade
        
        # Only record history if value actually changed
        if old_value != int(new_grade):
            # Update the grade
            grade.grade = int(new_grade)
            db.commit()
            db.refresh(grade)
            
            # Create history entry for the update
            history_entry = GradeHistory.create_log(
                grade=grade,
                old_value=old_value,
                new_value=new_grade,
                action="update",
                changed_by=changed_by
            )
            db.add(history_entry)
            db.commit()
    
    return grade

def delete_grade(
    db: Session, 
    grade_id: int,
    changed_by: str = None
) -> Optional[Grade]:
    """Delete a grade by ID and record history."""
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if grade:
        # Store grade details before deletion
        deleted_grade_copy = Grade(
            id=grade.id,
            student_id=grade.student_id,
            subject=grade.subject,
            grade=grade.grade
        )
        
        # Delete the grade
        db.delete(grade)
        
        # Create history entry for the deletion
        history_entry = GradeHistory.create_log(
            grade=deleted_grade_copy,
            old_value=deleted_grade_copy.grade,
            new_value=None,
            action="delete",
            changed_by=changed_by
        )
        db.add(history_entry)
        db.commit()
        
        return deleted_grade_copy
    
    return None

def get_grades_by_student(db: Session, student_id: int) -> List[Grade]:
    """Get all grades for a student."""
    return db.query(Grade).filter(Grade.student_id == student_id).all()

def bulk_create_grades(
    db: Session, 
    grades_data: List[Dict[str, Any]],
    validator: GradeValidator = default_validator,
    changed_by: str = None
) -> Tuple[List[Grade], List[str]]:
    """Bulk create grades with history tracking."""
    successful_grades = []
    errors = []
    history_entries = []
    
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
                db.flush()  # Flush to get the ID
                
                # Create history entry
                history_entry = GradeHistory.create_log(
                    grade=new_grade,
                    old_value=None,
                    new_value=new_grade.grade,
                    action="create",
                    changed_by=changed_by
                )
                history_entries.append(history_entry)
                
                successful_grades.append(new_grade)
                
            except Exception as e:
                errors.append(f"Row {idx+1}: {str(e)}")
        
        # Add all history entries
        for entry in history_entries:
            db.add(entry)
            
        # Commit all successful grades and history entries
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

# Functions to get grade history
def get_grade_history(db: Session, grade_id: int) -> List[GradeHistory]:
    """Get history for a specific grade ID."""
    return db.query(GradeHistory).filter(GradeHistory.grade_id == grade_id).order_by(GradeHistory.id.desc()).all()

def get_student_grade_history(
    db: Session, 
    student_id: int,
    subject: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[GradeHistory]:
    """Get grade history for a student, with optional filters."""
    query = db.query(GradeHistory).filter(GradeHistory.student_id == student_id)
    
    # Apply filters if provided
    if subject:
        query = query.filter(GradeHistory.subject == subject)
    if start_date:
        query = query.filter(GradeHistory.timestamp >= start_date)
    if end_date:
        query = query.filter(GradeHistory.timestamp <= end_date)
        
    return query.order_by(GradeHistory.timestamp.desc()).all()

def get_all_grade_history(
    db: Session,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[GradeHistory]:
    """Get all grade history with pagination and filters."""
    query = db.query(GradeHistory)
    
    # Apply filters if provided
    if start_date:
        query = query.filter(GradeHistory.timestamp >= start_date)
    if end_date:
        query = query.filter(GradeHistory.timestamp <= end_date)
    if action:
        query = query.filter(GradeHistory.action == action)
        
    # Apply pagination and sorting
    return query.order_by(GradeHistory.timestamp.desc()).offset(offset).limit(limit).all()

def create_course(
    db: Session, 
    name: str, 
    description: str = None,
    teacher_id: Optional[int] = None
) -> Course:
    """Create a new course"""
    new_course = Course(
        name=name, 
        description=description,
        teacher_id=teacher_id
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course

def get_course(db: Session, course_id: int) -> Optional[Course]:
    """Get a course by ID"""
    return db.query(Course).filter(Course.id == course_id).first()

def get_courses(db: Session, skip: int = 0, limit: int = 100) -> List[Course]:
    """Get all courses with pagination"""
    return db.query(Course).offset(skip).limit(limit).all()

def add_student_to_course(
    db: Session, 
    student_id: int, 
    course_id: int,
    added_by: str = None
) -> StudentCourse:
    """Add a student to a course if not already enrolled"""
    # Check if student exists (assuming student_id is a valid user ID)
    # Check if course exists
    course = get_course(db, course_id)
    if not course:
        raise ValueError(f"Course with ID {course_id} does not exist")
    
    # Check if student already in course
    existing = db.query(StudentCourse).filter(
        StudentCourse.student_id == student_id, 
        StudentCourse.course_id == course_id
    ).first()
    
    if existing:
        raise ValueError(f"Student {student_id} is already enrolled in course {course_id}")
    
    # Add enrollment
    enrollment = StudentCourse(
        student_id=student_id, 
        course_id=course_id,
        added_by=added_by
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment

def remove_student_from_course(db: Session, student_id: int, course_id: int) -> bool:
    """Remove a student from a course"""
    enrollment = db.query(StudentCourse).filter(
        StudentCourse.student_id == student_id, 
        StudentCourse.course_id == course_id
    ).first()
    
    if not enrollment:
        raise ValueError(f"Student {student_id} is not enrolled in course {course_id}")
    
    db.delete(enrollment)
    db.commit()
    return True

def get_students_in_course(db: Session, course_id: int) -> List[int]:
    """Get all student IDs enrolled in a course"""
    enrollments = db.query(StudentCourse).filter(StudentCourse.course_id == course_id).all()
    return [enrollment.student_id for enrollment in enrollments]

def get_courses_for_student(db: Session, student_id: int) -> List[Course]:
    """Get all courses a student is enrolled in"""
    enrollments = db.query(StudentCourse).filter(StudentCourse.student_id == student_id).all()
    course_ids = [enrollment.course_id for enrollment in enrollments]
    if not course_ids:
        return []  # Return empty list if student has no courses
    return db.query(Course).filter(Course.id.in_(course_ids)).all()