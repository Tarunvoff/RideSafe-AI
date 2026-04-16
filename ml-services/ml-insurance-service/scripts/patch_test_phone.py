import os
import psycopg2
from dotenv import load_dotenv

def patch_test_phone():
    # Load env
    load_dotenv()
    # Check parents for env if not found
    for _ in range(3):
        if os.getenv("DATABASE_URL"):
            break
        os.chdir("..")
        load_dotenv()

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ DATABASE_URL not found in environment")
        return

    # Configuration for test driver
    target_driver_name = os.getenv("TEST_DRIVER_NAME", "Vignesh")
    phone_to_set = os.getenv("TEST_PHONE_NUMBER", "+919600422401")

    print(f"--- Patching Driver: {target_driver_name} with Phone: {phone_to_set} ---")

    try:
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            # 1. Update Test Driver's phone number
            cur.execute(
                "UPDATE users SET phone = %s WHERE \"driverName\" ILIKE %s", 
                (phone_to_set, f"%{target_driver_name}%")
            )
            updated = cur.rowcount
            conn.commit()
            print(f"✅ Successfully updated {updated} record(s).")
            
            # 2. Verify current state
            cur.execute(
                "SELECT id, \"driverName\", phone, \"fraudWarningCount\" FROM users WHERE \"driverName\" ILIKE %s",
                (f"%{target_driver_name}%",)
            )
            rows = cur.fetchall()
            for row in rows:
                print(f"Current State -> User: {row[1]} | ID: {row[0]} | Phone: {row[2]} | Warnings: {row[3]}")
                
        conn.close()
    except Exception as e:
        print(f"❌ Database Error: {e}")

if __name__ == "__main__":
    patch_test_phone()
