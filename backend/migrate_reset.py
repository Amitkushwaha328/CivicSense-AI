import sys
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("Adding reset_token to users table...")
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN reset_token VARCHAR(50) NULL"))
        print("Column reset_token added.")
    except Exception as e:
        print(f"Column may already exist: {e}")

    conn.commit()
    print("Migration complete.")
