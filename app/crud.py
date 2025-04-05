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