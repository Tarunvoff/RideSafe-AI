import os
import logging
from twilio.rest import Client
import psycopg2
import time
from dotenv import load_dotenv
from config import ENFORCEMENT_FRAUD_THRESHOLD, ENFORCEMENT_MAX_WARNINGS

# Safety load for cases where main.py import order is tricky
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))

logger = logging.getLogger(__name__)
# Add file handler for diagnostics
fh = logging.FileHandler(os.path.join(os.path.dirname(__file__), "enforcement_debug.log"))
fh.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(fh)
logger.setLevel(logging.INFO)

# ==============================================================================
# AEGIS ACTIVE ENFORCEMENT LAYER
# ==============================================================================
# MISSION: This engine orchestrates the "Twilio Compliance Hammer." It is not 
# a mere notification service; it is the "Active Enforcement Layer" of Aegis.
#
# HIGH-PERFORMANCE PROOF: When the Fraud Ensemble dispatches a score >= 90, 
# this layer dispatches an "Irrevocable Legal Timestamped Warning." This 
# creates a Safe-Harbor Moat for the insurance provider, allowing for the 
# autonomous mitigation of financial liability in real-time.
# ==============================================================================

class AegisEnforcementEngine:
    def __init__(self):
        # Twilio Config
        self.twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.twilio_phone = os.getenv("TWILIO_PHONE_NUMBER")
        
        # Database Config
        # Convert DATABASE_URL from NestJS format to Python psycopg2 format if needed
        # NestJS: postgresql://user:pass@host:port/db
        self.db_url = os.getenv("DATABASE_URL")
        
        # Initialize Twilio Client
        try:
            if self.twilio_sid and self.twilio_token:
                self.twilio_client = Client(self.twilio_sid, self.twilio_token)
                logger.info("Twilio Client initialized successfully.")
            else:
                self.twilio_client = None
                logger.warning("Twilio credentials missing. SMS enforcement will be skipped.")
        except Exception as e:
            self.twilio_client = None
            logger.error(f"Failed to initialize Twilio Client: {e}")

    def _get_db_connection(self):
        try:
            conn = psycopg2.connect(self.db_url)
            return conn
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return None

    def enforce_fraud_policy(self, driver_id: str, fraud_score: float, phone_number: str = None):
        """
        Main enforcement logic for extreme confidence fraud detections.
        """
        if not driver_id:
            return

        # Normalizing threshold: if score is 0-100, target is set in config (e.g., 90.0).
        if fraud_score < ENFORCEMENT_FRAUD_THRESHOLD:
            return

        logger.info(f"[FRAUD_DETECTION] Fraud Score {fraud_score} detected for Driver {driver_id}.")

        # 1. Update Database & Check Warning Count
        warning_count = 0
        is_suspended = False
        conn = self._get_db_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    # Update warning count
                    cur.execute(
                        'UPDATE users SET "fraudWarningCount" = "fraudWarningCount" + 1 WHERE id = %s RETURNING "fraudWarningCount"',
                        (driver_id,)
                    )
                    row = cur.fetchone()
                    if row:
                        warning_count = row[0]
                        logger.info(f"Driver {driver_id} warning count incremented to {warning_count}.")
                        
                        # Suspension logic
                        if warning_count >= ENFORCEMENT_MAX_WARNINGS:
                            cur.execute(
                                'UPDATE users SET "isActive" = FALSE WHERE id = %s',
                                (driver_id,)
                            )
                            # Also update FraudAnalysis status if it exists
                            cur.execute(
                                'UPDATE fraud_analysis SET status = \'SUSPENDED\' WHERE "userId" = %s',
                                (driver_id,)
                            )
                            is_suspended = True
                            logger.info(f"Driver {driver_id} suspended due to excessive violations.")
                    conn.commit()
            except Exception as e:
                logger.error(f"Database enforcement failed for {driver_id}: {e}")
                conn.rollback()
            finally:
                conn.close()

        # 2. Send SMS Notification
        if self.twilio_client and phone_number:
            try:
                msg_body = (
                    "Aegis Compliance: Unusual activity detected on your account (Location Conflict). "
                    "Multiple simultaneous logins are a violation of your insurance terms. "
                    "Your account is under 24/7 monitoring. Continued violations will lead to an immediate block."
                )
                
                if is_suspended:
                    msg_body = "Aegis: Your account has been suspended indefinitely due to repeated compliance violations."

                self.twilio_client.messages.create(
                    body=msg_body,
                    from_=self.twilio_phone,
                    to=phone_number
                )
                logger.info(f"[FRAUD_DETECTION] Compliance SMS Sent to {phone_number}. Warning Count: {warning_count}/3.")
            except Exception as e:
                logger.error(f"Twilio SMS delivery failed: {e}")
        else:
            logger.warning(f"[FRAUD_DETECTION] SMS skipped (Client={bool(self.twilio_client)}, Phone={phone_number}).")

        logger.info(f"[FRAUD_DETECTION] Fraud Score {fraud_score} detected for Driver {driver_id}. Warning Count: {warning_count}/{ENFORCEMENT_MAX_WARNINGS}.")

# Singleton instance
enforcement_engine = AegisEnforcementEngine()
