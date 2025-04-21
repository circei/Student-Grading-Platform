import json
from datetime import datetime
from typing import Optional, Any, Dict, Union
from sqlalchemy.orm import Session
from app.database import ActivityLog

def log_activity(
    db: Session,
    action: str,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[Union[str, int]] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    status_code: Optional[int] = None
) -> ActivityLog:
    """
    Log an activity in the system.
    
    Args:
        db: Database session
        action: Action performed (e.g., "login", "create", "view", "update", "delete")
        user_id: ID of the user performing the action
        user_email: Email of the user performing the action
        resource_type: Type of resource being acted upon (e.g., "grade", "course")
        resource_id: ID of the resource being acted upon
        details: Additional details about the action as a dictionary
        ip_address: IP address of the user
        user_agent: User agent string from the request
        status_code: HTTP status code of the response
    """
    # Convert details to JSON string if provided
    details_json = None
    if details:
        try:
            details_json = json.dumps(details)
        except:
            details_json = str(details)

    # Create log entry
    log_entry = ActivityLog(
        user_id=user_id,
        user_email=user_email,
        timestamp=datetime.now().isoformat(),
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        details=details_json,
        ip_address=ip_address,
        user_agent=user_agent,
        status_code=status_code
    )
    
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    
    return log_entry

def get_request_ip(request) -> str:
    """Extract client IP address from a FastAPI request"""
    if "x-forwarded-for" in request.headers:
        return request.headers["x-forwarded-for"].split(",")[0].strip()
    elif hasattr(request.client, "host"):
        return request.client.host
    return None

def get_logs(
    db: Session, 
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> list:
    """Query logs with filters and pagination"""
    query = db.query(ActivityLog)
    
    # Apply filters if provided
    if user_id:
        query = query.filter(ActivityLog.user_id == user_id)
    if action:
        query = query.filter(ActivityLog.action == action)
    if resource_type:
        query = query.filter(ActivityLog.resource_type == resource_type)
    if start_date:
        query = query.filter(ActivityLog.timestamp >= start_date)
    if end_date:
        query = query.filter(ActivityLog.timestamp <= end_date)
        
    # Order by timestamp descending (newest first)
    query = query.order_by(ActivityLog.timestamp.desc())
    
    # Apply pagination
    return query.offset(offset).limit(limit).all()