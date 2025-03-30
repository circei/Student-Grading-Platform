# test_main.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool  # import StaticPool
from app.main import app, get_db  # our FastAPI app and dependency to override
from app.database import Base

# Create an in-memory SQLite database with a StaticPool to reuse the connection
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"  # in-memory DB

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool  # Ensures the same connection is used
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create all tables in the test database
Base.metadata.create_all(bind=engine)

# Dependency override for testing
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_signup_and_login():
    # Test the signup endpoint
    response = client.post(
        "/auth/signup",
        json={"username": "johndoe", "email": "john@example.com", "password": "secret"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "johndoe"
    assert data["email"] == "john@example.com"

    # Test duplicate signup returns an error
    response = client.post(
        "/auth/signup",
        json={"username": "johndoe", "email": "john@example.com", "password": "secret"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Username already registered"

    # Test login endpoint
    response = client.post(
        "/auth/login",
        data={"username": "johndoe", "password": "secret"}
    )
    assert response.status_code == 200
    token = response.json().get("access_token")
    assert token is not None

    # Test protected endpoint using the obtained token
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/users/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "johndoe"