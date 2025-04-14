# test_main.py

# Monkey-patch firebase_admin.initialize_app to prevent certificate initialization errors during tests.
import firebase_admin
firebase_admin.initialize_app = lambda *args, **kwargs: None

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app, get_db, get_current_user
from app.database import Base, User as DBUser

# Create an in-memory SQLite database with a StaticPool to reuse the connection
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create all tables in the test database
Base.metadata.create_all(bind=engine)

# Dependency override for the database
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# For testing, override get_current_user to bypass Firebase verification.
def override_get_current_user() -> DBUser:
    db = next(override_get_db())
    user = db.query(DBUser).filter(DBUser.username == "johndoe").first()
    if not user:
        # Create a dummy user if not already present
        user = DBUser(username="johndoe", email="john@example.com", hashed_password="dummy")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

app.dependency_overrides[get_current_user] = lambda: override_get_current_user()

client = TestClient(app)

def test_signup_and_login():
    # Test the signup endpoint
    response = client.post(
        "/auth/signup",
        json={"username": "johndoe", "email": "john@example.com", "password": "secret123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "johndoe"
    assert data["email"] == "john@example.com"

    # Test duplicate signup returns an error
    response = client.post(
        "/auth/signup",
        json={"username": "johndoe", "email": "john@example.com", "password": "secret123"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Username already registered"

    # Test protected endpoint using the overridden get_current_user
    headers = {"Authorization": "Bearer dummy"}  # The token value is ignored in tests
    response = client.get("/users/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "johndoe"

def test_create_student():
    response = client.post("/students", json={"name": "John Doe", "email": "john@example.com", "date_of_birth": "2000-01-01"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "John Doe"
    assert data["email"] == "john@example.com"