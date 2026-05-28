const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../../.env' });
const prisma = new PrismaClient();

async function clean() {
  console.log("🧹 [DB Cleanup] Deleting abnormal price history (price < 1000)...");
  const historyResult = await prisma.priceHistory.deleteMany({
    where: {
      price: { lt: 1000 }
    }
  });
  console.log(`🧹 Deleted ${historyResult.count} abnormal price history records.`);
  
  await prisma.$disconnect();
}
clean().catch(console.error);
