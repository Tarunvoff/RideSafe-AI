import os
import sys
from twilio.rest import Client
from dotenv import load_dotenv

# Ensure utf-8 output for Windows terminals
if sys.stdout.encoding != 'utf-8':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def test_sms_gateway():
    # Load env
    load_dotenv()
    curr = os.getcwd()
    for _ in range(3):
        if os.getenv("TWILIO_ACCOUNT_SID"):
            break
        os.chdir("..")
        load_dotenv()
    os.chdir(curr)

    sid = os.getenv("TWILIO_ACCOUNT_SID")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    phone_from = os.getenv("TWILIO_PHONE_NUMBER")
    # Default to test number if not in env
    phone_to = os.getenv("TEST_PHONE_NUMBER", "+919600422401")

    if not all([sid, token, phone_from]):
        print("❌ Missing Twilio credentials in environment.")
        return

    print(f"--- Triggering SMS Gateway Drill ---")
    print(f"DEBUG: Using From={phone_from} | To={phone_to}")

    try:
        client = Client(sid, token)
        message = client.messages.create(
            body="Aegis Production Drill: Testing SMS gateway connectivity. System is operational.",
            from_=phone_from,
            to=phone_to
        )
        print(f"✅ SUCCESS: Message sent! SID: {message.sid}")
    except Exception as e:
        print(f"❌ FAILURE: {e}")

if __name__ == "__main__":
    test_sms_gateway()
