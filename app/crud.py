from sqlalchemy.orm import Session
from app.database import Grade

def create_grade(db: Session, student_id: int, subject: str, grade: int):
    new_grade = Grade(student_id=student_id, subject=subject, grade=grade)
    db.add(new_grade)
    db.commit()
    db.refresh(new_grade)
    return new_grade

def get_grades_by_student(db: Session, student_id: int):
    return db.query(Grade).filter(Grade.student_id == student_id).all()

def update_grade(db: Session, grade_id: int, new_grade: int):
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if grade:
        grade.grade = new_grade
        db.commit()
        db.refresh(grade)
    return grade

def delete_grade(db: Session, grade_id: int):
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if grade:
        db.delete(grade)
        db.commit()
    return grade

def bulk_create_grades(db: Session, grades_data: list):
    """
    Create multiple grades at once from a list of grade data.
    
    Args:
        db: Database session
        grades_data: List of dictionaries with student_id, subject, grade
        
    Returns:
        tuple: (successful_grades, errors)
    """
    successful_grades = []
    errors = []
    
    for idx, grade_data in enumerate(grades_data):
        try:
            # Validate required fields
            if not all(k in grade_data for k in ["student_id", "subject", "grade"]):
                errors.append(f"Row {idx+1}: Missing required fields (student_id, subject, grade)")
                continue
                
            # Validate data types
            try:
                student_id = int(grade_data["student_id"])
                grade_value = int(grade_data["grade"])
                subject = str(grade_data["subject"])
            except (ValueError, TypeError):
                errors.append(f"Row {idx+1}: Invalid data types (student_id and grade must be integers)")
                continue
                
            # Validate grade range (assuming grades are between 0-100)
            if not (0 <= grade_value <= 100):
                errors.append(f"Row {idx+1}: Grade must be between 0 and 100")
                continue
                
            # Create grade
            new_grade = Grade(
                student_id=student_id,
                subject=subject,
                grade=grade_value
            )
            db.add(new_grade)
            successful_grades.append(new_grade)
            
        except Exception as e:
            errors.append(f"Row {idx+1}: Unexpected error: {str(e)}")
            
    # Commit all successful grades
    if successful_grades:
        db.commit()
        for grade in successful_grades:
            db.refresh(grade)
            
    return successful_grades, errors