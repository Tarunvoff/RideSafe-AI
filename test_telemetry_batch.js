// test_telemetry_batch.js
const API_URL = 'http://localhost:3001/api';

async function testTimescaleIngestion() {
    console.log("=================================================");
    console.log("🌊 TESTING TIMESCALEDB BATCH INGESTION (PORT 5433) 🌊");
    console.log("=================================================\n");

    console.log("1. Generating a massive batch of 25 simulated H3 Telemetry Logs spanning various Indian zones...");
    
    const events = [];
    const baseLat = 12.9716; // Blr
    const baseLng = 77.5946;

    for (let i = 0; i < 25; i++) {
        // We generate fake Lf scores to simulate what the Port 8003 Grid Event Service computes
        const simulatedLf = (Math.random() * 0.9).toFixed(2);
        
        events.push({
            h3_cell: `88618920b${i}fffff`,
            lf_score: parseFloat(simulatedLf),
            weather: Math.random() > 0.8 ? "Heavy Rain" : "Clear",
            aqi: Math.floor(Math.random() * 300)
        });
    }

    console.log(`2. Firing Async POST request to NestJS Telemetry Ingestion Endpoint...`);
    
    try {
        const res = await fetch(`${API_URL}/telemetry/ingest-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events })
        });

        if (res.ok) {
            const data = await res.json();
            console.log("\n✅ TimescaleDB Successfully Responded!");
            console.log(data);
            console.log("\n(You will also see the NestJS terminal print out 'TimescaleDB Ingestion Phase: 25 logs archived'!)");
        } else {
            console.error("❌ Failed writing to TimescaleDB: ", await res.text());
        }
    } catch (e) {
        console.error("❌ Could not connect to API.", e);
    }
}

testTimescaleIngestion();
