from sqlalchemy.orm import Session
from app.database import Course, Grade, StudentCourse, Student
from app.validators import GradeValidator
from typing import Tuple, List, Dict, Any, Optional
from datetime import datetime
from app.database import Grade, GradeHistory
from sqlalchemy import func

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
    """Create a new grade and record history."""
    grade_data = {"student_id": student_id, "subject": subject, "grade": grade}
    is_valid, error_message = validator.validate_grade_data(grade_data)
    if not is_valid:
        raise ValueError(error_message)

    new_grade = Grade(student_id=student_id, subject=subject, grade=grade)
    db.add(new_grade)
    db.commit()
    db.refresh(new_grade)

    # Record history
    create_grade_history(
        db,
        grade_id=new_grade.id,
        student_id=student_id,
        subject=subject,
        old_value=None,
        new_value=grade,
        action="create",
        changed_by=changed_by
    )
    return new_grade

def update_grade(
    db: Session, 
    grade_id: int, 
    new_grade: int,
    validator: GradeValidator = default_validator,
    changed_by: str = None
) -> Optional[Grade]:
    """Update a grade and record history."""
    is_valid, error_message = validator.validate_grade(new_grade)
    if not is_valid:
        raise ValueError(error_message)

    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if grade:
        old_value = grade.grade
        grade.grade = new_grade
        db.commit()
        db.refresh(grade)

        # Record history
        create_grade_history(
            db,
            grade_id=grade.id,
            student_id=grade.student_id,
            subject=grade.subject,
            old_value=old_value,
            new_value=new_grade,
            action="update",
            changed_by=changed_by
        )
        return grade
    return None

def delete_grade(
    db: Session, 
    grade_id: int,
    changed_by: str = None
) -> Optional[Grade]:
    """Delete a grade and record history."""
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if grade:
        db.delete(grade)
        db.commit()

        # Record history
        create_grade_history(
            db,
            grade_id=grade.id,
            student_id=grade.student_id,
            subject=grade.subject,
            old_value=grade.grade,
            new_value=None,
            action="delete",
            changed_by=changed_by
        )
        return grade
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
                history_entry = create_grade_history(
                    db=db,
                    grade_id=new_grade.id,
                    student_id=new_grade.student_id,
                    subject=new_grade.subject,
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
    """Retrieve grade history for a specific grade."""
    return db.query(GradeHistory).filter(GradeHistory.grade_id == grade_id).all()

def get_student_grade_history(
    db: Session, 
    student_id: int,
    subject: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[GradeHistory]:
    """Retrieve grade history for a specific student."""
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

def get_grades_by_student_and_course(db: Session, student_id: int, course_id: int) -> List[Grade]:
    """
    Get all grades for a student that are related to a specific course.
    
    This implementation filters grades based on course enrollment and can be extended 
    to filter by specific subjects associated with the course.
    """
    # Get course details
    course = get_course(db, course_id)
    if not course:
        return []
    
    # Check if student is enrolled in the course
    student_ids = get_students_in_course(db, course_id)
    if student_id not in student_ids:
        return []  # Student not in course
    
    # Get all grades for the student
    grades = get_grades_by_student(db, student_id)
    
    # In a real-world implementation with course-subject relationships:
    # 1. You would get all subjects associated with this course
    # 2. Then filter the grades to only include those subjects
    
    # For now, we'll implement a basic filtering mechanism based on course name
    # This assumes subjects might contain course name or code
    filtered_grades = []
    course_keywords = course.name.lower().split()
    
    # Filter grades that might be related to the course based on subject name
    for grade in grades:
        # Check if any course keyword appears in the subject
        subject_lower = grade.subject.lower()
        if any(keyword in subject_lower for keyword in course_keywords):
            filtered_grades.append(grade)
    
    # If no grades match the filtering, fall back to all grades
    # This is a safety measure since our filtering is basic
    if not filtered_grades and grades:
        return grades
        
    return filtered_grades

def calculate_student_averages(db: Session, student_id: int, course_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Calculate a student's grade averages - both per-subject and overall.
    
    Args:
        db: Database session
        student_id: ID of the student
        course_id: Optional course ID to filter grades by course
        
    Returns:
        Dictionary with subject averages and overall average
    """
    # Get grades based on whether course filtering is needed
    grades = []
    if course_id:
        # Use the enhanced course-specific grades function
        grades = get_grades_by_student_and_course(db, student_id, course_id)
    else:
        # Get all grades for student if no course filtering
        grades = get_grades_by_student(db, student_id)
    
    if not grades:
        return {
            "student_id": student_id,
            "subject_averages": {},
            "overall_average": None,
            "total_grades": 0,
            "course_id": course_id  # Include course ID if provided
        }
    
    # Calculate averages per subject
    subject_grades = {}
    for grade in grades:
        if grade.subject not in subject_grades:
            subject_grades[grade.subject] = []
        subject_grades[grade.subject].append(grade.grade)
    
    # Calculate the average for each subject
    subject_averages = {}
    for subject, grades_list in subject_grades.items():
        subject_averages[subject] = sum(grades_list) / len(grades_list)
    
    # Calculate overall average
    all_grades = [grade.grade for grade in grades]
    overall_average = sum(all_grades) / len(all_grades)
    
    result = {
        "student_id": student_id,
        "subject_averages": subject_averages,
        "overall_average": overall_average,
        "total_grades": len(all_grades)
    }
    
    # Include course information if provided
    if course_id:
        result["course_id"] = course_id
        
        # Get course name for reference
        course = get_course(db, course_id)
        if course:
            result["course_name"] = course.name
    
    return result

def calculate_course_averages(db: Session, course_id: int) -> Dict[str, Any]:
    """
    Calculate the average grades for all students in a course.
    
    Args:
        db: Database session
        course_id: ID of the course
        
    Returns:
        Dictionary with course statistics
    """
    # Get all students in the course
    student_ids = get_students_in_course(db, course_id)
    
    if not student_ids:
        return {
            "course_id": course_id,
            "student_averages": [],
            "subject_averages": {},
            "overall_average": None,
            "total_students": 0
        }
    
    # Calculate averages for each student
    student_averages = []
    all_grades = []
    subject_grades = {}
    
    for student_id in student_ids:
        student_data = calculate_student_averages(db, student_id)
        student_averages.append({
            "student_id": student_id,
            "average": student_data["overall_average"]
        })
        
        # Collect grades per subject for course-wide subject averages
        for subject, avg in student_data["subject_averages"].items():
            if subject not in subject_grades:
                subject_grades[subject] = []
            subject_grades[subject].append(avg)
        
        if student_data["overall_average"] is not None:
            all_grades.append(student_data["overall_average"])
    
    # Calculate subject averages across all students
    course_subject_averages = {}
    for subject, grades_list in subject_grades.items():
        course_subject_averages[subject] = sum(grades_list) / len(grades_list)
    
    # Calculate overall course average
    course_average = sum(all_grades) / len(all_grades) if all_grades else None
    
    return {
        "course_id": course_id,
        "student_averages": student_averages,
        "subject_averages": course_subject_averages,
        "overall_average": course_average,
        "total_students": len(student_averages)
    }

def create_student(db: Session, name: str, email: str, date_of_birth: str):
    student = Student(name=name, email=email, date_of_birth=date_of_birth)
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

def get_student(db: Session, student_id: int):
    return db.query(Student).filter(Student.id == student_id).first()

def get_students(db: Session, skip: int = 0, limit: int = 10):
    return db.query(Student).offset(skip).limit(limit).all()

def update_student(db: Session, student_id: int, name: str = None, email: str = None, date_of_birth: str = None):
    student = db.query(Student).filter(Student.id == student_id).first()
    if student:
        if name:
            student.name = name
        if email:
            student.email = email
        if date_of_birth:
            student.date_of_birth = date_of_birth
        db.commit()
        db.refresh(student)
    return student

def delete_student(db: Session, student_id: int):
    student = db.query(Student).filter(Student.id == student_id).first()
    if student:
        db.delete(student)
        db.commit()
    return student

def create_grade_history(
    db: Session,
    grade_id: int,
    student_id: int,
    subject: str,
    old_value: Optional[int],
    new_value: Optional[int],
    action: str,
    changed_by: Optional[str]
):
    """Create a new grade history entry."""
    history_entry = GradeHistory(
        grade_id=grade_id,
        student_id=student_id,
        subject=subject,
        old_value=old_value,
        new_value=new_value,
        action=action,
        timestamp=datetime.now().isoformat(),
        changed_by=changed_by
    )
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)
    return history_entry