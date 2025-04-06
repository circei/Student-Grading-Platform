from typing import Tuple, Optional, Dict, Any

class GradeValidator:
    """Validator for grade data with configurable rules."""
    
    def __init__(self, min_grade: int = 0, max_grade: int = 100):
        """
        Initialize the grade validator with grade range limits.
        
        Args:
            min_grade: Minimum allowed grade value (default: 0)
            max_grade: Maximum allowed grade value (default: 100)
        """
        self.min_grade = min_grade
        self.max_grade = max_grade
    
    def validate_grade(self, grade_value: Any) -> Tuple[bool, Optional[str]]:
        """
        Validate a single grade value.
        
        Args:
            grade_value: The grade value to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check if it can be converted to int
        try:
            grade_int = int(grade_value)
        except (ValueError, TypeError):
            return False, f"Grade must be a valid integer, got: {grade_value}"
        
        # Check if it's within the valid range
        if not (self.min_grade <= grade_int <= self.max_grade):
            return False, f"Grade must be between {self.min_grade} and {self.max_grade}, got: {grade_int}"
        
        return True, None
    
    def validate_grade_data(self, grade_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Validate a grade data dictionary containing student_id, subject, and grade.
        
        Args:
            grade_data: Dictionary with grade data
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check if required fields exist
        required_fields = ["student_id", "subject", "grade"]
        if not all(field in grade_data for field in required_fields):
            missing = [field for field in required_fields if field not in grade_data]
            return False, f"Missing required fields: {', '.join(missing)}"
        
        # Validate student_id
        try:
            student_id = int(grade_data["student_id"])
            if student_id <= 0:
                return False, f"Student ID must be a positive integer, got: {student_id}"
        except (ValueError, TypeError):
            return False, f"Student ID must be a valid integer, got: {grade_data['student_id']}"
        
        # Validate subject
        subject = str(grade_data["subject"]).strip()
        if not subject:
            return False, "Subject cannot be empty"
        
        # Validate grade
        is_valid, error_message = self.validate_grade(grade_data["grade"])
        if not is_valid:
            return False, error_message
        
        return True, None