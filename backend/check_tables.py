# CAConnect — Check Tables Script
# Run this to list all tables, RLS status, trigger, and policies.
# Usage: python check_tables.py

import os
import sys

import psycopg2
from dotenv import load_dotenv

# Load environment variables using absolute path
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)


def check_tables():
    """List tables, RLS status, trigger, and all policies."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL is not set in .env")
        sys.exit(1)

    conn = psycopg2.connect(database_url, options='-c client_encoding=UTF8')
    cur = conn.cursor()

    # 1. List our 3 tables and their RLS status
    print("=" * 60)
    print("TABLES AND RLS STATUS")
    print("=" * 60)
    cur.execute("""
        SELECT tablename, rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN ('profiles', 'corporate_actions', 'reviews')
        ORDER BY tablename;
    """)
    rows = cur.fetchall()
    for table, rls in rows:
        status = "ENABLED" if rls else "DISABLED"
        print(f"  {table}: RLS {status}")

    # 2. List all policies on our tables
    print()
    print("=" * 60)
    print("RLS POLICIES")
    print("=" * 60)
    cur.execute("""
        SELECT tablename, policyname, cmd, roles
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('profiles', 'corporate_actions', 'reviews')
        ORDER BY tablename, policyname;
    """)
    rows = cur.fetchall()
    for table, policy, cmd, roles in rows:
        print(f"  {table} | {policy} | {cmd} | {roles}")

    # 3. List the trigger
    print()
    print("=" * 60)
    print("TRIGGERS")
    print("=" * 60)
    cur.execute("""
        SELECT trigger_name, event_manipulation, event_object_table, action_statement
        FROM information_schema.triggers
        WHERE event_object_schema = 'auth'
          AND trigger_name = 'on_auth_user_created';
    """)
    rows = cur.fetchall()
    if rows:
        for name, event, table, action in rows:
            print(f"  {name} | {event} ON {table} | {action}")
    else:
        print("  (no trigger found)")

    # 4. List the trigger function
    print()
    print("=" * 60)
    print("TRIGGER FUNCTION")
    print("=" * 60)
    cur.execute("""
        SELECT proname, prosecdef
        FROM pg_proc
        WHERE proname = 'handle_new_user'
          AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    """)
    rows = cur.fetchall()
    if rows:
        for name, secdef in rows:
            print(f"  {name} | SECURITY DEFINER = {secdef}")
    else:
        print("  (no trigger function found)")

    cur.close()
    conn.close()
    print()
    print("Check complete.")


if __name__ == "__main__":
    check_tables()