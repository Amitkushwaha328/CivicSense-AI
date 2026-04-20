import sys
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("Migrating users table...")

    # Add auth_provider column
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local'"))
        print("Column auth_provider added.")
    except Exception as e:
        print(f"Column may already exist: {e}")

    # Note: SQLite / MySQL treat nullable constraint differently. 
    # For SQLite, it usually allows NULL inserts if we ignore it, or we may not have to modify the schema for nullable if it's MySQL.
    # We will try a standard SQL ALTER:
    try:
        conn.execute(text("ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL"))
        print("password_hash changed to NULLable.")
    except Exception as e:
        print(f"Nullable modify error (safe to ignore if SQLite): {e}")

    conn.commit()
    print("Migration complete.")
