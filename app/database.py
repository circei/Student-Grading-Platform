from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./app.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# SQLAlchemy User model (this will be used for DB persistence)
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

class Grade(Base):
    __tablename__ = "grades"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, nullable=False)  # Foreign key to User.id
    subject = Column(String, nullable=False)
    grade = Column(Integer, nullable=False)

class GradeHistory(Base):
    __tablename__ = "grade_history"
    id = Column(Integer, primary_key=True, index=True)
    grade_id = Column(Integer, nullable=False)  # ID of the grade being modified
    student_id = Column(Integer, nullable=False)  # Student ID for easy querying
    subject = Column(String, nullable=False)  # Subject for readability in logs
    old_value = Column(Integer, nullable=True)  # Null for new grades
    new_value = Column(Integer, nullable=True)  # Null for deleted grades
    action = Column(String, nullable=False)  # "create", "update", "delete"
    timestamp = Column(String, nullable=False)  # ISO format timestamp
    changed_by = Column(String, nullable=True)  # User who made the change
    
    @classmethod
    def create_log(cls, grade, old_value, new_value, action, changed_by=None):
        """Helper method to create a history log entry"""
        return cls(
            grade_id=grade.id,
            student_id=grade.student_id,
            subject=grade.subject,
            old_value=old_value,
            new_value=new_value,
            action=action,
            timestamp=datetime.now().isoformat(),
            changed_by=changed_by
        )

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    teacher_id = Column(Integer, nullable=True)  # Optional teacher assignment
    created_at = Column(String, default=datetime.now().isoformat())

class StudentCourse(Base):
    __tablename__ = "student_courses"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, nullable=False)  
    course_id = Column(Integer, nullable=False)
    joined_at = Column(String, default=datetime.now().isoformat())
    # Track who added the student for audit purposes
    added_by = Column(String, nullable=True)

def init_db():
    Base.metadata.create_all(bind=engine)