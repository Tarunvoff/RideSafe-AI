import os
import psycopg2
from dotenv import load_dotenv

def verify_user():
    # Load env
    load_dotenv()
    # Robust env finding
    curr = os.getcwd()
    for _ in range(3):
        if os.getenv("DATABASE_URL"):
            break
        os.chdir("..")
        load_dotenv()
    os.chdir(curr)

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ DATABASE_URL not found")
        return

    target_name = os.getenv("TEST_DRIVER_NAME", "Vignesh")

    try:
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            print(f"--- Searching for records matching: '{target_name}' ---")
            cur.execute("SELECT id, \"driverName\", phone FROM users WHERE \"driverName\" ILIKE %s", (f"%{target_name}%",))
            rows = cur.fetchall()
            if not rows:
                print("⚠️ No matching records found.")
            for row in rows:
                print(f"ID: {row[0]} | Name: {row[1]} | Phone: {row[2]}")
        conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    verify_user()
