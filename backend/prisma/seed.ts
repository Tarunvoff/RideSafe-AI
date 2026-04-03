import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

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
    const anyPrisma = prisma as any;
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

  // 2. Seed Disruption Event
  const now = Date.now();
  const occurredAt = new Date(now - 10 * 60 * 1000);
  const expiresAt = new Date(now + 2 * 24 * 60 * 60 * 1000);

  await (prisma as any).disruptionEvent.deleteMany({
    where: { type: { in: ['RAIN', 'AQI'] } },
  });

  const disruptionEvent = await (prisma as any).disruptionEvent.create({
    data: {
      type: 'RAIN',
      title: 'Heavy Rain Warning',
      expectedLoss: 850,
      expectedPayout: 800,
      occurredAt,
      expiresAt,
      verified: true,
    },
  });
  console.log(`✅ Disruption Event: ${disruptionEvent.title}`);

  // 3. Seed Test User (matches OAuth flow)
  const testEmail = 'zepto@oauth.com';
  const testPassword = 'oauth-mock-password';
  const passwordHash = await bcrypt.hash(testPassword, 10);

  let testUser = await (prisma as any).user.findUnique({
    where: { email: testEmail },
  });

  if (!testUser) {
    testUser = await (prisma as any).user.create({
      data: {
        email: testEmail,
        passwordHash,
        driverName: 'Rajesh Kumar',
        role: 'DRIVER',
        isVerified: true,
      },
    });
    console.log(`✅ Test User: ${testEmail}`);
  } else {
    console.log(`ℹ️  Test User already exists: ${testEmail}`);
  }

  // 4. Seed KYC Profile (APPROVED)
  await (prisma as any).kYCProfile.upsert({
    where: { userId: testUser.id },
    update: {
      status: 'APPROVED',
      submittedAt: new Date(now - 24 * 60 * 60 * 1000),
      reviewedAt: new Date(now - 23 * 60 * 60 * 1000),
      reviewNote: 'Auto-approved for demo',
    },
    create: {
      userId: testUser.id,
      status: 'APPROVED',
      submittedAt: new Date(now - 24 * 60 * 60 * 1000),
      reviewedAt: new Date(now - 23 * 60 * 60 * 1000),
      reviewNote: 'Auto-approved for demo',
    },
  });

  await (prisma as any).kYCBasicIdentity.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      fullName: 'Rajesh Kumar',
      dob: new Date('1995-06-15'),
      gender: 'Male',
    },
  });

  await (prisma as any).kYCPersonalDetails.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      address: '123 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
    },
  });

  await (prisma as any).kYCIdentityVerification.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      aadhaarNumber: '1234-5678-9012',
      panNumber: 'ABCDE1234F',
    },
  });

  await (prisma as any).kYCPayoutSetup.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      method: 'UPI',
      upiId: 'rajesh@paytm',
    },
  });

  // 5. Seed Fraud Analysis (LOW RISK)
  await (prisma as any).fraudAnalysis.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      gpsLatitude: 12.9716,
      gpsLongitude: 77.5946,
      riskScore: 15.5,
      status: 'APPROVED',
      deviceIntegrity: 'PASS',
      networkType: 'MOBILE',
      velocityCheck: 'PASS',
      analysisDetails: 'Low risk profile',
      reviewedAt: new Date(now - 23 * 60 * 60 * 1000),
    },
  });

  console.log(`✅ KYC Profile: APPROVED`);

  // 6. Seed Active Policy (Standard Plan)
  const standardPlan = createdPlans.find((p) => p.key === 'STANDARD');
  if (standardPlan) {
    const policyStartDate = new Date(now - 2 * 24 * 60 * 60 * 1000);
    const policyEndDate = new Date(now + 5 * 24 * 60 * 60 * 1000);

    const existingPolicy = await (prisma as any).policy.findFirst({
      where: {
        userId: testUser.id,
        status: 'ACTIVE',
      },
    });

    if (!existingPolicy) {
      const policy = await (prisma as any).policy.create({
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
      await (prisma as any).payout.create({
        data: {
          policyId: policy.id,
          disruptionEventId: disruptionEvent.id,
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

  console.log('\n🎉 Seed completed!');
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
