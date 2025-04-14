import os
from datetime import datetime
from sqlalchemy import create_engine

BACKUP_DIR = "backups"

def create_backup(database_url: str):
    """Create a backup of the database."""
    # Ensure the backup directory exists
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)

    # Generate a timestamped backup filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(BACKUP_DIR, f"backup_{timestamp}.sqlite")

    # Copy the database file
    engine = create_engine(database_url)
    with engine.connect() as conn:
        with open(backup_file, "wb") as f:
            for chunk in conn.connection.iterdump():
                f.write(f"{chunk}\n".encode("utf-8"))

    return backup_file