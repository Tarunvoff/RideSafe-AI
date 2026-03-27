const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ include: { kycProfile: true } });
  fs.writeFileSync('test_kyc.json', JSON.stringify(users, null, 2), 'utf8');
}
main().catch(console.error).finally(() => prisma.$disconnect());
