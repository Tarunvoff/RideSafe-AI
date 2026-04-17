const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.user.groupBy({
    by: ['role'],
    _count: { _all: true }
  });
  console.log(JSON.stringify(counts, null, 2));

  const sample = await prisma.user.findMany({
    take: 5,
    select: { email: true, role: true, platform: true }
  });
  console.log('Sample Users:', JSON.stringify(sample, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
