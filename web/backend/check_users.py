
import sys
import os

# Set up path to import app modules
# Container /app is in PYTHONPATH

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models import User
from app.config import get_settings

settings = get_settings()
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print(f"Database URL: {settings.DATABASE_URL}")

try:
    users = db.query(User).all()
    print(f"Found {len(users)} users:")
    for user in users:
        print(f"ID: {user.id}")
        print(f"Email: {user.email}")
        print(f"Display Name: {user.display_name}")
        print(f"Hash Format: {user.password_hash[:10]}... (Len: {len(user.password_hash)})")
        if ":" in user.password_hash:
            salt, h = user.password_hash.split(":", 1)
            print(f"  Salt: {salt} (Len: {len(salt)})")
            print(f"  Hash: {h[:10]}...")
        else:
            print("  WARNING: Invalid hash format (no colon)")
        print("-" * 20)
except Exception as e:
    print(f"Error querying users: {e}")
