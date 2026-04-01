#!/usr/bin/env node

/**
 * Parametric Insurance Real-Time Test
 *
 * Run: node test_parametric_insurance.js
 */

const http = require('http');
const https = require('https');

const API = {
  NESTJS_API: 'http://localhost:3001/api',
};

const TEST_DATA = {
  deviceId: `device_${Date.now()}`,
  provider: 'zepto',
  lat: 12.9716,
  lng: 77.5946,
  plan: 'STANDARD',
};

const TIMEOUT = 20000;

function makeRequest(url, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const options = {
      method,
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Aegis-ParametricTest/1.0',
        ...headers,
      },
      timeout: TIMEOUT,
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, body: parsed || data });
        } catch (e) {
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, body: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${TIMEOUT}ms`));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('=== PARAMETRIC INSURANCE REAL-TIME TEST ===');

  console.log('\n[1] Seed dynamic driver');
  const seedRes = await makeRequest(
    `${API.NESTJS_API}/dynamic-qcommerce/drivers/seed`,
    'POST',
    { provider: TEST_DATA.provider, count: 1 }
  );

  if (!seedRes.ok || !seedRes.body?.driverIds?.length) {
    console.error(`Seed failed: status ${seedRes.status}`);
    process.exit(1);
  }

  const driverId = seedRes.body.driverIds[0];
  console.log(`  Driver: ${driverId}`);

  console.log('\n[2] Publish real GPS via Nest backend');
  const gpsRes = await makeRequest(
    `${API.NESTJS_API}/telemetry/gps`,
    'POST',
    {
      driverId,
      lat: TEST_DATA.lat,
      lng: TEST_DATA.lng,
      platform: 'mobile-app',
    }
  );
  if (gpsRes.ok) {
    console.log(`  GPS accepted for ${gpsRes.body?.driverId ?? driverId}`);
  } else {
    console.log(`  GPS publish failed: status ${gpsRes.status}`);
  }

  await new Promise((r) => setTimeout(r, 1500));

  console.log('\n[3] Enroll policy');
  const enrollRes = await makeRequest(
    `${API.NESTJS_API}/policy/enroll`,
    'POST',
    {
      driverId,
      plan: TEST_DATA.plan,
    }
  );
  if (enrollRes.ok) {
    console.log(`  Enrolled: ${enrollRes.body?.plan ?? 'n/a'} Ct=${enrollRes.body?.Ct ?? 'n/a'}`);
  } else {
    console.log(`  Enroll failed: status ${enrollRes.status}`);
    if (enrollRes.body) {
      console.log(`  Enroll error: ${JSON.stringify(enrollRes.body)}`);
    }
  }

  console.log('\n[4] Weekly premium');
  const premiumRes = await makeRequest(
    `${API.NESTJS_API}/premium/weekly`,
    'POST',
    { driverId }
  );
  if (premiumRes.ok) {
    console.log(`  Premium: INR ${premiumRes.body?.premium ?? 'n/a'}`);
  } else {
    console.log(`  Premium failed: status ${premiumRes.status}`);
  }

  console.log('\n[5] Trigger evaluation');
  const triggerRes = await makeRequest(
    `${API.NESTJS_API}/trigger/evaluate`,
    'POST',
    { driverId }
  );
  if (triggerRes.ok) {
    console.log(`  Trigger: ${triggerRes.body?.decision ?? 'n/a'}`);
  } else {
    console.log(`  Trigger failed: status ${triggerRes.status}`);
  }

  console.log('\n[6] Payout calculation');
  const payoutCalcRes = await makeRequest(
    `${API.NESTJS_API}/payout/calculate`,
    'POST',
    { driverId }
  );
  if (payoutCalcRes.ok) {
    console.log(`  Payout: INR ${payoutCalcRes.body?.payoutAmount ?? 'n/a'}`);
  } else {
    console.log(`  Payout calc failed: status ${payoutCalcRes.status}`);
  }

  console.log('\n[7] Orchestrator process');
  const insuranceRes = await makeRequest(
    `${API.NESTJS_API}/insurance/process/${driverId}`,
    'POST',
    {
      deviceId: TEST_DATA.deviceId,
      eventType: 'ZONE_HALTED',
    }
  );
  if (insuranceRes.ok) {
    console.log(`  Decision: ${insuranceRes.body?.decision ?? 'n/a'}`);
    console.log(`  Payout: INR ${insuranceRes.body?.payout ?? 0}`);
  } else {
    console.log(`  Orchestrator failed: status ${insuranceRes.status}`);
  }

  console.log('\n[8] Payout process (optional)');
  const payoutProcessRes = await makeRequest(
    `${API.NESTJS_API}/payout/process`,
    'POST',
    {
      driverId,
      payoutAmount: payoutCalcRes.body?.payoutAmount ?? insuranceRes.body?.payout ?? 0,
      disruptionType: 'HALTED',
    }
  );
  if (payoutProcessRes.ok && payoutProcessRes.body?.success) {
    console.log(`  Payout processed: txn=${payoutProcessRes.body?.transactionId ?? 'n/a'}`);
  } else {
    console.log(`  Payout process skipped/failed: status ${payoutProcessRes.status}`);
  }

  console.log('\nDone.');
}

run().catch((err) => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
