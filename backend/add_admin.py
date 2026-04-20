import sys
import os

# Add the current directory to sys.path so we can import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models.user import User, UserRole
from auth_utils import hash_password
import uuid

def add_admin():
    print("\n🚀 --- CivicSense AI Admin Creator ---")
    
    name = input("Enter Admin Name: ").strip()
    email = input("Enter Admin Email: ").strip()
    password = input("Enter Admin Password: ").strip()
    city = input("Enter City (Default: Headquarters): ").strip() or "Headquarters"

    if not name or not email or not password:
        print("❌ Error: Name, Email, and Password are required!")
        return

    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"⚠️  User with email '{email}' already exists.")
            choice = input("Do you want to promote this user to Admin? (y/n): ").lower()
            if choice == 'y':
                existing_user.role = UserRole.admin
                db.commit()
                print(f"✅ User '{email}' has been promoted to Admin!")
            else:
                print("❌ Operation cancelled.")
            return

        # Create new admin
        new_admin = User(
            id=str(uuid.uuid4()),
            name=name,
            email=email,
            password_hash=hash_password(password),
            role=UserRole.admin,
            city=city,
            points=1000  # Give admins some starting points
        )

        db.add(new_admin)
        db.commit()
        print(f"\n✨ SUCCESS! Admin '{name}' created with email '{email}'.")
        print("You can now log in at: http://localhost:3000/login")

    except Exception as e:
        db.rollback()
        print(f"❌ An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_admin()
