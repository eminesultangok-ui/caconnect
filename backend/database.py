# CAConnect — Database Setup Script
# Run this manually to create tables, policies, trigger, and seed data.
# Usage: python database.py

import os
import sys

import psycopg2
from dotenv import load_dotenv

# Load environment variables using absolute path
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)


def get_connection():
    """Create a connection to the Supabase PostgreSQL database."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL is not set in .env")
        sys.exit(1)
    return psycopg2.connect(database_url, options='-c client_encoding=UTF8')


def run_setup():
    """Read and execute setup_database.sql."""
    # Build absolute path to the SQL file (same folder as this script)
    sql_path = os.path.join(os.path.dirname(__file__), "setup_database.sql")

    print(f"Reading SQL from: {sql_path}")
    with open(sql_path, "r", encoding="utf-8") as f:
        sql = f.read()

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql)
        conn.commit()
        cur.close()
        print("Database initialization completed successfully")
    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}")
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    run_setup()