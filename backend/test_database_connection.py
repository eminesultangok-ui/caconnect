# CAConnect — Database Connection Test
# Run this to verify the database connection works.
# Usage: python test_database_connection.py

import os
import sys

import psycopg2
from dotenv import load_dotenv

# Load environment variables using absolute path
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)


def test_connection():
    """Test the database connection by running SELECT 1."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL is not set in .env")
        sys.exit(1)

    # Mask the password in any output for security
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        cur.execute("SELECT 1")
        result = cur.fetchone()
        cur.close()
        conn.close()

        if result and result[0] == 1:
            print("Database connection successful")
        else:
            print("ERROR: Unexpected result from database")
            sys.exit(1)
    except Exception as e:
        # Print error without exposing password
        err_msg = str(e).replace(database_url, "****")
        print(f"ERROR: Connection failed — {err_msg}")
        sys.exit(1)


if __name__ == "__main__":
    test_connection()