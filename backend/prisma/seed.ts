import { KYCStatus, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as h3 from 'h3-js';
import 'dotenv/config';

const prisma = new PrismaClient();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? '').trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

async function ensureAdminUser() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('⚠️  ADMIN_EMAIL/ADMIN_PASSWORD not set. Skipping admin seed.');
    return null;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!existing) {
    return prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        phone: '+91-admin',
        passwordHash,
        role: 'ADMIN',
        isVerified: true,
      },
    });
  }

  const data: any = {};
  if (existing.role !== 'ADMIN') data.role = 'ADMIN';
  if (!existing.isVerified) data.isVerified = true;
  const passwordMatches = await bcrypt.compare(ADMIN_PASSWORD, existing.passwordHash);
  if (!passwordMatches) data.passwordHash = passwordHash;
  if (Object.keys(data).length === 0) return existing;
  return prisma.user.update({ where: { id: existing.id }, data });
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function buildAnalysisDetails(input: {
  city: string;
  platform: string;
  riskScore: number;
  kycStatus: KYCStatus;
  payoutType: string;
}) {
  const factors: string[] = [];
  if (input.riskScore >= 80) factors.push('Severe risk score (>= 80)');
  if (input.riskScore >= 65 && input.riskScore < 80) factors.push('Elevated risk score (65-79)');
  if (input.kycStatus !== 'APPROVED') factors.push(`KYC status ${input.kycStatus}`);
  if (input.payoutType === 'FLOOD') factors.push('Flood disruption spike in district');
  if (input.payoutType === 'CYCLONE') factors.push('Cyclone corridor cluster detected');
  if (input.payoutType === 'AQI') factors.push('AQI anomaly during peak shift');
  if (input.payoutType === 'HEATWAVE') factors.push('Heatwave fatigue signal');

  return {
    region: {
      state: 'Tamil Nadu',
      city: input.city,
    },
    platform: input.platform,
    riskFactors: factors.length ? factors : ['No elevated signals detected'],
    signalSummary: {
      scoreBand: input.riskScore >= 70 ? 'HIGH' : input.riskScore >= 45 ? 'MEDIUM' : 'LOW',
      lastWindowDays: 14,
    },
  };
}

async function main() {
  console.log('🌱 Seeding database...');

  const adminUser = await ensureAdminUser();
  if (adminUser) {
    console.log(`✅ Admin user ready: ${adminUser.email}`);
  }

  // 1. Seed Weekly Plans
  const weeklyPlans = [
    {
      key: 'BASIC',
      name: 'Basic Shield',
      price: 39,
      maxPayout: 1800,
      durationDays: 7,
      eligibleDisruptionTypes: ['RAIN'],
    },
    {
      key: 'STANDARD',
      name: 'Standard Guard',
      price: 79,
      maxPayout: 3600,
      durationDays: 7,
      eligibleDisruptionTypes: ['RAIN', 'AQI'],
    },
    {
      key: 'PREMIUM',
      name: 'Premium Armor',
      price: 129,
      maxPayout: 6500,
      durationDays: 7,
      eligibleDisruptionTypes: ['RAIN', 'AQI', 'FLOOD', 'DISRUPTION'],
    },
  ];

  const createdPlans: any[] = [];
  for (const plan of weeklyPlans) {
    const anyPrisma = prisma;
    const created = await anyPrisma.weeklyPlan.upsert({
      where: { key: plan.key },
      update: {
        name: plan.name,
        price: plan.price,
        maxPayout: plan.maxPayout,
        durationDays: plan.durationDays,
        eligibleDisruptionTypes: plan.eligibleDisruptionTypes,
      },
      create: {
        key: plan.key,
        name: plan.name,
        price: plan.price,
        maxPayout: plan.maxPayout,
        durationDays: plan.durationDays,
        eligibleDisruptionTypes: plan.eligibleDisruptionTypes,
      },
    });
    createdPlans.push(created);
    console.log(`✅ Plan: ${plan.name}`);
  }

  // 2. Seed Disruption Events (Tamil Nadu)
  const now = Date.now();
  const disruptions = [
    {
      type: 'RAIN',
      title: 'Chennai Monsoon Surge',
      expectedLoss: 900,
      expectedPayout: 820,
      occurredAt: new Date(now - 4 * 60 * 60 * 1000),
      expiresAt: new Date(now + 36 * 60 * 60 * 1000),
      verified: true,
    },
    {
      type: 'FLOOD',
      title: 'Delta Flood Advisory',
      expectedLoss: 1300,
      expectedPayout: 1100,
      occurredAt: new Date(now - 18 * 60 * 60 * 1000),
      expiresAt: new Date(now + 24 * 60 * 60 * 1000),
      verified: true,
    },
    {
      type: 'HEATWAVE',
      title: 'Coimbatore Heatwave Watch',
      expectedLoss: 700,
      expectedPayout: 600,
      occurredAt: new Date(now - 30 * 60 * 60 * 1000),
      expiresAt: new Date(now + 20 * 60 * 60 * 1000),
      verified: true,
    },
    {
      type: 'AQI',
      title: 'Madurai AQI Spike',
      expectedLoss: 500,
      expectedPayout: 420,
      occurredAt: new Date(now - 42 * 60 * 60 * 1000),
      expiresAt: new Date(now + 10 * 60 * 60 * 1000),
      verified: true,
    },
    {
      type: 'CYCLONE',
      title: 'Nagapattinam Cyclone Alert',
      expectedLoss: 1600,
      expectedPayout: 1400,
      occurredAt: new Date(now - 60 * 60 * 60 * 1000),
      expiresAt: new Date(now + 48 * 60 * 60 * 1000),
      verified: true,
    },
  ];

  await prisma.disruptionEvent.deleteMany({
    where: { title: { in: disruptions.map((d) => d.title) } },
  });

  const createdDisruptions: any[] = [];
  for (const disruption of disruptions) {
    const created = await prisma.disruptionEvent.create({ data: disruption });
    createdDisruptions.push(created);
    console.log(`✅ Disruption Event: ${created.title}`);
  }

  // 3. Seed Test User (matches OAuth flow)
  const testEmail = 'zepto@oauth.com';
  const testPassword = 'oauth-mock-password';
  const passwordHash = await bcrypt.hash(testPassword, 10);

  let testUser = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        driverName: 'Rajesh Kumar',
        platform: 'zepto',
        role: 'DRIVER',
        isVerified: true,
      },
    });
    console.log(`✅ Test User: ${testEmail}`);
  } else {
    if (!testUser.platform) {
      testUser = await prisma.user.update({
        where: { id: testUser.id },
        data: { platform: 'zepto' },
      });
    }
    console.log(`ℹ️  Test User already exists: ${testEmail}`);
  }

  // 4. Seed KYC Profile (APPROVED)
  await prisma.kYCProfile.upsert({
    where: { userId: testUser.id },
    update: {
      status: 'APPROVED',
      submittedAt: new Date(now - 24 * 60 * 60 * 1000),
      reviewedAt: new Date(now - 23 * 60 * 60 * 1000),
      reviewNote: 'Approved via seeded baseline policy review',
    },
    create: {
      userId: testUser.id,
      status: 'APPROVED',
      submittedAt: new Date(now - 24 * 60 * 60 * 1000),
      reviewedAt: new Date(now - 23 * 60 * 60 * 1000),
      reviewNote: 'Approved via seeded baseline policy review',
    },
  });

  await prisma.kYCBasicIdentity.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      fullName: 'Rajesh Kumar',
      dob: new Date('1995-06-15'),
      gender: 'Male',
    },
  });

  await prisma.kYCPersonalDetails.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      address: '12 Marina Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
    },
  });

  await prisma.kYCIdentityVerification.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      aadhaarNumber: '1234-5678-9012',
      panNumber: 'ABCDE1234F',
    },
  });

  await prisma.kYCPayoutSetup.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      method: 'UPI',
      upiId: 'rajesh@paytm',
    },
  });

  // 5. Seed Fraud Analysis (LOW RISK)
  await prisma.fraudAnalysis.upsert({
    where: { userId: testUser.id },
    update: {
      riskScore: 15.5,
      status: 'APPROVED',
      deviceIntegrity: 'PASS',
      networkType: 'MOBILE',
      velocityCheck: 'PASS',
      analysisDetails: JSON.stringify(
        buildAnalysisDetails({
          city: 'Chennai',
          platform: 'zepto',
          riskScore: 15.5,
          kycStatus: 'APPROVED',
          payoutType: 'RAIN',
        }),
      ),
    },
    create: {
      userId: testUser.id,
      gpsLatitude: 12.9716,
      gpsLongitude: 77.5946,
      riskScore: 15.5,
      status: 'APPROVED',
      deviceIntegrity: 'PASS',
      networkType: 'MOBILE',
      velocityCheck: 'PASS',
      analysisDetails: JSON.stringify(
        buildAnalysisDetails({
          city: 'Chennai',
          platform: 'zepto',
          riskScore: 15.5,
          kycStatus: 'APPROVED',
          payoutType: 'RAIN',
        }),
      ),
      reviewedAt: new Date(now - 23 * 60 * 60 * 1000),
    },
  });

  console.log(`✅ KYC Profile: APPROVED`);

  const disruptionByType = new Map(createdDisruptions.map((d) => [d.type, d]));

  const driverSeeds: Array<{
    email: string;
    name: string;
    city: string;
    platform: string;
    kycStatus: KYCStatus;
    riskScore: number;
    fraudStatus: string;
    planKey: string;
    payoutType: string;
    daysAgo: number;
  }> = [
    {
      email: 'vignesh.chn@aegis.in',
      name: 'Vignesh K',
      city: 'Chennai',
      platform: 'zepto',
      kycStatus: 'APPROVED',
      riskScore: 18,
      fraudStatus: 'APPROVED',
      planKey: 'STANDARD',
      payoutType: 'RAIN',
      daysAgo: 1,
    },
    {
      email: 'kavya.cbe@aegis.in',
      name: 'Kavya S',
      city: 'Coimbatore',
      platform: 'instamart',
      kycStatus: 'SUBMITTED',
      riskScore: 52,
      fraudStatus: 'INCONCLUSIVE',
      planKey: 'BASIC',
      payoutType: 'HEATWAVE',
      daysAgo: 2,
    },
    {
      email: 'arun.mdu@aegis.in',
      name: 'Arun V',
      city: 'Madurai',
      platform: 'blinkit',
      kycStatus: 'APPROVED',
      riskScore: 62,
      fraudStatus: 'APPROVED',
      planKey: 'STANDARD',
      payoutType: 'AQI',
      daysAgo: 3,
    },
    {
      email: 'meena.tri@aegis.in',
      name: 'Meena R',
      city: 'Tiruchirappalli',
      platform: 'bigbasket',
      kycStatus: 'IN_PROGRESS',
      riskScore: 76,
      fraudStatus: 'INCONCLUSIVE',
      planKey: 'BASIC',
      payoutType: 'FLOOD',
      daysAgo: 4,
    },
    {
      email: 'saravanan.slm@aegis.in',
      name: 'Saravanan M',
      city: 'Salem',
      platform: 'jiomart',
      kycStatus: 'APPROVED',
      riskScore: 84,
      fraudStatus: 'ESCALATED',
      planKey: 'PREMIUM',
      payoutType: 'CYCLONE',
      daysAgo: 5,
    },
    {
      email: 'divya.tvl@aegis.in',
      name: 'Divya P',
      city: 'Tirunelveli',
      platform: 'zepto',
      kycStatus: 'REJECTED',
      riskScore: 41,
      fraudStatus: 'REJECTED',
      planKey: 'BASIC',
      payoutType: 'RAIN',
      daysAgo: 6,
    },
    {
      email: 'karthik.erd@aegis.in',
      name: 'Karthik N',
      city: 'Erode',
      platform: 'instamart',
      kycStatus: 'APPROVED',
      riskScore: 33,
      fraudStatus: 'APPROVED',
      planKey: 'STANDARD',
      payoutType: 'AQI',
      daysAgo: 7,
    },
    {
      email: 'anjali.vlr@aegis.in',
      name: 'Anjali S',
      city: 'Vellore',
      platform: 'blinkit',
      kycStatus: 'SUBMITTED',
      riskScore: 67,
      fraudStatus: 'INCONCLUSIVE',
      planKey: 'BASIC',
      payoutType: 'FLOOD',
      daysAgo: 8,
    },
  ];

  const driverPassword = await bcrypt.hash('driver-123', 10);

  for (const seed of driverSeeds) {
    const existing = await prisma.user.findUnique({ where: { email: seed.email } });
    const driver = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            driverName: seed.name,
            platform: seed.platform,
            role: 'DRIVER',
            isVerified: true,
          },
        })
      : await prisma.user.create({
          data: {
            email: seed.email,
            passwordHash: driverPassword,
            driverName: seed.name,
            platform: seed.platform,
            role: 'DRIVER',
            isVerified: true,
          },
        });

    await prisma.kYCProfile.upsert({
      where: { userId: driver.id },
      update: { status: seed.kycStatus },
      create: {
        userId: driver.id,
        status: seed.kycStatus,
        submittedAt: daysAgo(seed.daysAgo + 1),
        reviewedAt: seed.kycStatus === 'APPROVED' ? daysAgo(seed.daysAgo) : null,
        reviewNote: seed.kycStatus === 'APPROVED' ? 'Approved via seeded regional policy review' : null,
      },
    });

    await prisma.kYCBasicIdentity.upsert({
      where: { userId: driver.id },
      update: {},
      create: {
        userId: driver.id,
        fullName: seed.name,
        dob: new Date('1994-02-12'),
        gender: 'Male',
      },
    });

    await prisma.kYCPersonalDetails.upsert({
      where: { userId: driver.id },
      update: {},
      create: {
        userId: driver.id,
        address: `Main Road, ${seed.city}`,
        city: seed.city,
        state: 'Tamil Nadu',
        pincode: '600001',
      },
    });

    await prisma.kYCIdentityVerification.upsert({
      where: { userId: driver.id },
      update: {},
      create: {
        userId: driver.id,
        aadhaarNumber: `9876-54${seed.daysAgo}0-1122`,
        panNumber: `TNPA${seed.daysAgo}22Q`,
      },
    });

    await prisma.kYCPayoutSetup.upsert({
      where: { userId: driver.id },
      update: {},
      create: {
        userId: driver.id,
        method: 'UPI',
        upiId: `${seed.name.split(' ')[0].toLowerCase()}@upi`,
      },
    });

    await prisma.fraudAnalysis.upsert({
      where: { userId: driver.id },
      update: {
        gpsLatitude: 13.0827,
        gpsLongitude: 80.2707,
        riskScore: seed.riskScore,
        status: seed.fraudStatus,
        deviceIntegrity: seed.riskScore > 70 ? 'WARN' : 'PASS',
        networkType: 'MOBILE',
        velocityCheck: seed.riskScore > 70 ? 'FAIL' : 'PASS',
        analysisDetails: JSON.stringify(
          buildAnalysisDetails({
            city: seed.city,
            platform: seed.platform,
            riskScore: seed.riskScore,
            kycStatus: seed.kycStatus,
            payoutType: seed.payoutType,
          }),
        ),
      },
      create: {
        userId: driver.id,
        gpsLatitude: 13.0827,
        gpsLongitude: 80.2707,
        riskScore: seed.riskScore,
        status: seed.fraudStatus,
        deviceIntegrity: seed.riskScore > 70 ? 'WARN' : 'PASS',
        networkType: 'MOBILE',
        velocityCheck: seed.riskScore > 70 ? 'FAIL' : 'PASS',
        analysisDetails: JSON.stringify(
          buildAnalysisDetails({
            city: seed.city,
            platform: seed.platform,
            riskScore: seed.riskScore,
            kycStatus: seed.kycStatus,
            payoutType: seed.payoutType,
          }),
        ),
        reviewedAt: seed.fraudStatus === 'APPROVED' ? daysAgo(seed.daysAgo) : null,
        createdAt: daysAgo(seed.daysAgo + 2),
      },
    });

    const selectedPlan = createdPlans.find((p) => p.key === seed.planKey);
    if (selectedPlan) {
      const existingPolicy = await prisma.policy.findFirst({
        where: { userId: driver.id, planType: seed.planKey },
      });

      const policy = existingPolicy
        ? existingPolicy
        : await prisma.policy.create({
            data: {
              userId: driver.id,
              planType: seed.planKey,
              status: 'ACTIVE',
              premium: selectedPlan.price,
              startDate: daysAgo(seed.daysAgo + 5),
              endDate: daysAgo(seed.daysAgo - 2),
              weeklyPlanId: selectedPlan.id,
            },
          });

      const disruption = disruptionByType.get(seed.payoutType) ?? createdDisruptions[0];
      const existingPayout = await prisma.payout.findFirst({
        where: { policyId: policy.id, disruptionEventId: disruption.id },
      });

      if (!existingPayout) {
        await prisma.payout.create({
          data: {
            policyId: policy.id,
            disruptionEventId: disruption.id,
            status: seed.kycStatus === 'APPROVED' ? 'APPROVED' : 'PROCESSING',
            estimatedLoss: disruption.expectedLoss ?? 0,
            approvedPayout: disruption.expectedPayout ?? 0,
            processingTime: 'Regional auto-processing',
            createdAt: daysAgo(seed.daysAgo),
            timeline: {
              steps: [
                { event: 'Disruption Detected', done: true },
                { event: 'Claim Auto-Triggered', done: true },
                { event: 'AI Verification', done: seed.kycStatus === 'APPROVED' },
                { event: 'Payout Processed', done: seed.kycStatus === 'APPROVED' },
              ],
            },
          },
        });
      }
    }
  }

  // 6. Seed Active Policy (Standard Plan)
  const standardPlan = createdPlans.find((p) => p.key === 'STANDARD');
  if (standardPlan) {
    const policyStartDate = new Date(now - 2 * 24 * 60 * 60 * 1000);
    const policyEndDate = new Date(now + 5 * 24 * 60 * 60 * 1000);

    const existingPolicy = await prisma.policy.findFirst({
      where: {
        userId: testUser.id,
        status: 'ACTIVE',
      },
    });

    if (!existingPolicy) {
      const policy = await prisma.policy.create({
        data: {
          userId: testUser.id,
          planType: 'STANDARD',
          status: 'ACTIVE',
          premium: 79,
          startDate: policyStartDate,
          endDate: policyEndDate,
          weeklyPlanId: standardPlan.id,
        },
      });
      console.log(`✅ Active Policy: ${standardPlan.name}`);

      // 7. Seed Payout (PROCESSING)
      await prisma.payout.create({
        data: {
          policyId: policy.id,
          disruptionEventId: createdDisruptions[0].id,
          status: 'PROCESSING',
          estimatedLoss: 850,
          approvedPayout: 800,
          processingTime: 'Auto-processing',
          timeline: {
            steps: [
              { event: 'Disruption Detected', done: true },
              { event: 'Claim Auto-Triggered', done: true },
              { event: 'AI Verification', done: false },
              { event: 'Payout Processed', done: false },
            ],
          },
        },
      });
      console.log(`✅ Payout: PROCESSING (₹800)`);
    } else {
      console.log(`ℹ️  Active policy already exists`);
    }
  }

  // ────── ZONE RISK DATA SEEDING (H3 Cells) ──────────────────────────────────
  console.log('\n🌱 Seeding H3 Zone Risk Data...');

  const SEED_CITIES = [
    { name: 'Bangalore', lat: 12.9716, lon: 77.5946 },
    { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
    { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  ];

  const RESOLUTIONS = [8, 9, 10];
  const DISK_RADIUS = 3; // Rings of neighbors per city center

  // Deterministic risk generator with varied distribution for better color mapping
  function generateRiskData(h3Index: string) {
    const seed = h3Index
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Use multiple offsets to create varied but deterministic data
    const norm = (offset = 0) => ((seed + offset) % 100) / 100; // 0–1
    
    // Create more variance: shift some results higher for better HIGH/MEDIUM distribution
    const riskVariance = norm(1);
    
    // Distribute: ~30% HIGH (70-100), ~40% MEDIUM (40-69), ~30% LOW (0-39)
    let riskScore: number;
    if (riskVariance > 0.7) {
      riskScore = Math.round(70 + norm(11) * 30); // HIGH: 70-100
    } else if (riskVariance > 0.3) {
      riskScore = Math.round(40 + norm(12) * 30); // MEDIUM: 40-69
    } else {
      riskScore = Math.round(norm(13) * 40); // LOW: 0-39
    }

    const riskLevel = riskScore > 69 ? 'HIGH' : riskScore > 39 ? 'MEDIUM' : 'LOW';
    const rainfall = parseFloat((norm(2) * 50).toFixed(1));
    const temperature = parseFloat((25 + norm(3) * 15).toFixed(1));
    const aqi = Math.round(50 + norm(4) * 200);
    const floodChanceVal = norm(5);
    const floodChance = floodChanceVal > 0.65 ? 'High' : floodChanceVal > 0.35 ? 'Medium' : 'Low';
    const disruptionScore = parseFloat(norm(6).toFixed(2));
    const trafficVal = norm(7);
    const trafficStatus =
      trafficVal > 0.65 ? 'Halt' : trafficVal > 0.35 ? 'Slow Traffic' : 'Stable Flow';
    const activeRiders = Math.round(norm(8) * 50);

    return {
      riskScore,
      riskLevel,
      rainfall,
      temperature,
      aqi,
      floodChance,
      disruptionScore,
      trafficStatus,
      activeRiders,
    };
  }

  let totalSeeded = 0;

  for (const city of SEED_CITIES) {
    for (const resolution of RESOLUTIONS) {
      const centerCell = h3.latLngToCell(city.lat, city.lon, resolution);
      const allCells = h3.gridDisk(centerCell, DISK_RADIUS);

      for (const h3Index of allCells) {
        const riskData = generateRiskData(h3Index);

        await prisma.zoneRiskData.upsert({
          where: { h3_cell: h3Index },
          update: { ...riskData, updatedAt: new Date() },
          create: { h3_cell: h3Index, ...riskData },
        });

        totalSeeded++;
      }

      console.log(`   ✅ ${city.name} R${resolution}: ${allCells.length} cells seeded`);
    }
  }

  console.log(`\n🎯 Zone Risk Seeding Complete: ${totalSeeded} cells seeded\n`);

  console.log('\n🎉 Database Seed Completed!');
  console.log('\n📱 Login Instructions:');
  console.log('   1. Open mobile app');
  console.log('   2. Click "Zepto" OAuth button');
  console.log('   3. Auto-login as: zepto@oauth.com');
  console.log('\n💰 Expected Data:');
  console.log('   - Available Plans: 2 (Basic, Premium)');
  console.log('   - Purchased Plans: 1 (Standard Guard)');
  console.log('   - Disruption: Heavy Rain Warning');
  console.log('   - Payout: ₹800 (PROCESSING)');
  console.log('   - Earnings (Ew): Generated by DynamicQCommerceService');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
