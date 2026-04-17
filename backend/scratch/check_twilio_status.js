const twilio = require('twilio');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function checkMessage(sid) {
  try {
    const message = await client.messages(sid).fetch();
    console.log('--- Message Status for ' + sid + ' ---');
    console.log('Status: ' + message.status);
    console.log('To: ' + message.to);
    console.log('From: ' + message.from);
    console.log('Error Code: ' + message.errorCode);
    console.log('Error Message: ' + message.errorMessage);
    console.log('-----------------------------------');
  } catch (err) {
    console.error('Error fetching message:', err.message);
  }
}

const sid = process.argv[2] || 'SM15d966d743aa78c8a11cbabb42f070b2';
checkMessage(sid);
