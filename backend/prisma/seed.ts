import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  // Weekly plans (values taken from your existing frontend mock UI)
  const weeklyPlans = [
    {
      key: 'basic',
      name: 'Basic Shield',
      price: 39,
      maxPayout: 1800,
      durationDays: 7,
      eligibleDisruptionTypes: ['RAIN'],
    },
    {
      key: 'pro',
      name: 'Pro Guard',
      price: 79,
      maxPayout: 3600,
      durationDays: 7,
      eligibleDisruptionTypes: ['RAIN', 'AQI'],
    },
    {
      key: 'elite',
      name: 'Elite Armor',
      price: 129,
      maxPayout: 6500,
      durationDays: 7,
      eligibleDisruptionTypes: ['RAIN', 'AQI', 'FLOOD', 'DISRUPTION'],
    },
  ];

  for (const plan of weeklyPlans) {
    const anyPrisma = prisma as any;
    await anyPrisma.weeklyPlan.upsert({
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
  }

  // Seed one verified disruption event so the Purchased Plans UI can show eligibility.
  // You can re-run the seed script to refresh it.
  const now = Date.now();
  const occurredAt = new Date(now - 10 * 60 * 1000); // 10 minutes ago
  const expiresAt = new Date(now + 2 * 24 * 60 * 60 * 1000); // 2 days

  await (prisma as any).disruptionEvent.deleteMany({
    where: { type: { in: ['RAIN', 'AQI'] } },
  });

  await (prisma as any).disruptionEvent.create({
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

