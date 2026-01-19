"""
Migration 001: Add new API keys to user_settings and create api_usage_stats table.

This migration adds:
- deepseek_api_key, dashscope_api_key, serper_api_key columns to user_settings
- api_usage_stats table for tracking API usage

Run with: python -m app.db.migrations.001_add_api_keys_and_usage
"""

import sqlite3
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent.parent.parent / "nexen.db"


def run_migration():
    """Run the migration."""
    print(f"Running migration on {DB_PATH}")

    if not DB_PATH.exists():
        print("Database does not exist. It will be created on startup.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if columns already exist in user_settings
        cursor.execute("PRAGMA table_info(user_settings)")
        existing_columns = {row[1] for row in cursor.fetchall()}

        # Add new API key columns if they don't exist
        new_columns = [
            ("deepseek_api_key", "TEXT"),
            ("dashscope_api_key", "TEXT"),
            ("serper_api_key", "TEXT"),
        ]

        for column_name, column_type in new_columns:
            if column_name not in existing_columns:
                print(f"Adding column: user_settings.{column_name}")
                cursor.execute(f"ALTER TABLE user_settings ADD COLUMN {column_name} {column_type}")
            else:
                print(f"Column already exists: user_settings.{column_name}")

        # Add token tracking columns to messages table
        cursor.execute("PRAGMA table_info(messages)")
        message_columns = {row[1] for row in cursor.fetchall()}

        message_new_columns = [
            ("prompt_tokens", "INTEGER DEFAULT 0"),
            ("completion_tokens", "INTEGER DEFAULT 0"),
        ]

        for column_name, column_def in message_new_columns:
            if column_name not in message_columns:
                print(f"Adding column: messages.{column_name}")
                cursor.execute(f"ALTER TABLE messages ADD COLUMN {column_name} {column_def}")
            else:
                print(f"Column already exists: messages.{column_name}")

        # Create api_usage_stats table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS api_usage_stats (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                provider VARCHAR(50) NOT NULL,
                date DATETIME NOT NULL,
                request_count INTEGER DEFAULT 0,
                prompt_tokens INTEGER DEFAULT 0,
                completion_tokens INTEGER DEFAULT 0,
                total_tokens INTEGER DEFAULT 0,
                estimated_cost FLOAT DEFAULT 0.0,
                model_usage TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        print("Created/verified api_usage_stats table")

        # Create indexes for api_usage_stats
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS ix_api_usage_stats_user_id
            ON api_usage_stats(user_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS ix_api_usage_stats_provider
            ON api_usage_stats(provider)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS ix_api_usage_stats_date
            ON api_usage_stats(date)
        """)
        print("Created/verified indexes")

        conn.commit()
        print("Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise

    finally:
        conn.close()


if __name__ == "__main__":
    run_migration()
