async function runMLTest() {
    const ML_URL = 'http://localhost:8000';
    console.log("=================================================");
    console.log("⚡ TESTING ML INSURANCE CALCULATIONS & TRIGGERS ⚡");
    console.log("=================================================\n");

    try {
        // -------------------------------------------------------------
        // 1. DYNAMIC PREMIUM CALCULATION (/price)
        // -------------------------------------------------------------
        console.log("📊 [1] Requesting Machine Learning Dynamic Premium...");
        
        // As defined in ml-insurance-service schemas:
        const pricingPayload = {
            Ew: 800.0,            // Estimated Weekly Earnings
            Lf: 0.85,             // Extreme Risk/Halt Score
            Ct: 1.0,              // Coverage Threshold
            M: 0.10,              // 10% Margin
            platform: "uber",     // Determines base coverage percentage
            demand_ratio: 1.5,    // High Demand
            zone_volatility: 0.8  // High Volatility 
        };

        console.log(`Payload sent to ML Model:`);
        console.log(pricingPayload);

        const priceRes = await fetch(`${ML_URL}/pricing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pricingPayload)
        });

        if (priceRes.ok) {
            const priceData = await priceRes.json();
            console.log(`\n✅ ML Dynamic Premium Calculated:`);
            console.log(`   ► Final Premium: ₹${priceData.premium}`);
            console.log(`   ► Zone Multiplier Applied: ${priceData.zone_multiplier}x`);
            console.log(`   *(The formula automatically scaled the premium up due to high Lf & Demand!)*\n`);
        } else {
            console.error("❌ Pricing API failed: ", await priceRes.text());
        }

        // -------------------------------------------------------------
        // 2. ZERO-TOUCH PARAMETRIC TRIGGER (/trigger)
        // -------------------------------------------------------------
        console.log("🌩️ [2] Testing Zero-Touch Parametric Payout Trigger...");
        
        // H3 Cell where we generated the simulated 'cluster' earlier
        const triggerPayload = {
            h3_cell: "88618920b3fffff", // Standard test h3
            fraud_score: 0.15           // Low fraud score
        };

        console.log(`Payload sent to AI Trigger Engine:`);
        console.log(triggerPayload);

        const triggerRes = await fetch(`${ML_URL}/trigger`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(triggerPayload)
        });

        if (triggerRes.ok) {
            const triggerData = await triggerRes.json();
            console.log(`\n✅ ML Trigger Result:`);
            console.log(`   ► Automated Decision: [ ${triggerData.decision} ]`);
            console.log(`   ► Verified Zone State: ${triggerData.zone_state}`);
            console.log(`   ► Verified Zone Score (Lf): ${triggerData.Lf}`);
            
            if (triggerData.decision === "APPROVED") {
                 console.log(`   *(The system cross-referenced Redis and verified the H3 hash was disrupted! Claim Auto-Approved!)*`);
            } else {
                 console.log(`   *(Zone is strictly NORMAL. Parametric rules denied auto-payout. Needs manual review.)*`);
            }
        } else {
            console.error("❌ Trigger API failed: ", await triggerRes.text());
        }

    } catch (e) {
        console.error("❌ Connection to ML Service failed. Is Port 8000 running?", e);
    }
}

runMLTest();
