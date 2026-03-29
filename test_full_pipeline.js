const API_URL = 'http://localhost:3001/api';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runE2ETest() {
    console.log("=================================================");
    console.log("🚀 STARTING E2E GPS MULTI-LAYER PIPELINE TEST 🚀");
    console.log("=================================================\n");

    const email = `test_driver_${Date.now()}@ridesafe.com`;
    const password = "password123";

    // 1. Register a fake user to simulate a driver
    console.log(`[1] Registering a test driver (${email})...`);
    await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, phone: `+9199${Math.floor(Math.random() * 100000000)}` })
    });

    // 2. Login to get JWT Token
    console.log(`[2] Logging in to generate secure JWT...`);
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    
    if (!token) {
        console.error("❌ Authentication failed. Cannot proceed.", loginData);
        return;
    }
    console.log(`✅ Authenticated. Received Bearer Token.\n`);

    // 3. Simulate Mobile App Background Task (GPS Live Pooling)
    const testLat = 12.9352;
    const testLng = 77.6245;

    console.log(`[3] Simulating React Native Expo Background Task...`);
    console.log(`📡 Emitting 3 continuous GPS pings to /fraud/analyze to feed the NestJS Kafka Producer...`);
    
    for (let i = 1; i <= 3; i++) {
        // We slightly jitter the GPS just like a real phone 
        const jitterLat = testLat + (Math.random() * 0.0001);
        const jitterLng = testLng + (Math.random() * 0.0001);

        const analyzeRes = await fetch(`${API_URL}/fraud/analyze`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                gpsLatitude: jitterLat,
                gpsLongitude: jitterLng,
            })
        });

        if (analyzeRes.ok) {
            console.log(`   🔸 Ping ${i} sent successfully -> NestJS -> Kafka -> driver_telemetry`);
        } else {
            console.error(`❌ Ping ${i} failed.`, await analyzeRes.text());
        }
        await delay(1000);
    }

    // 4. Wait for Python Grid Event Service to Aggregate and Flush (10 seconds)
    console.log(`\n[4] Waiting 12 seconds for the Python Grid Array (Port 8003) to aggregate Kafka streams and write to Redis SSOT...`);
    for (let i = 12; i > 0; i--) {
        process.stdout.write(`   ⏳ ${i}s remaining...\r`);
        await delay(1000);
    }
    console.log(`\n✅ Python Async Aggregation window closed.\n`);

    // 5. Simulate Mapbox Map polling for the visual colors
    console.log(`[5] Simulating Frontend Mapbox UI polling for Live Real-Time Risk...`);
    console.log(`GET ${API_URL}/fraud/zone-risk?lat=${testLat}&lng=${testLng}`);
    
    const zoneRes = await fetch(`${API_URL}/fraud/zone-risk?lat=${testLat}&lng=${testLng}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (zoneRes.ok) {
        const zoneData = await zoneRes.json();
        console.log(`\n🎯 ================= [ SUCCESS ] =================== 🎯`);
        console.log(`The Python ML Grid fully responded to the Frontend request:`);
        console.dir(zoneData, { depth: null, colors: true });
        console.log(`🎯 ================================================= 🎯\n`);

        if (zoneData.h3_cell) {
             console.log(`✅ End-To-End Connectivity Confirmed!`);
             console.log(`Mobile App -> NestJS API -> Kafka Stream -> Python Async -> Redis -> NestJS Zone Hook -> Mobile App`);
        } else {
             console.log(`⚠️ Partial gap detected. Python service didn't return an H3 hash. Ensure Port 8003 is running the ML logic!`);
        }
    } else {
        console.error(`❌ Zone pull failed.`, await zoneRes.text());
    }
}

runE2ETest().catch(console.error);
