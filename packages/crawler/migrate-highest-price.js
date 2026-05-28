const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration to update highestPrice for all products...');
  
  // 1. 모든 상품 조회
  const products = await prisma.product.findMany({
    select: { id: true }
  });
  
  console.log(`Found ${products.length} products to process.`);
  
  let count = 0;
  for (const product of products) {
    // 각 상품별 가격 이력 조회
    const history = await prisma.priceHistory.findMany({
      where: { productId: product.id },
      select: { price: true }
    });
    
    if (history.length > 0) {
      const prices = history.map(h => h.price);
      const highestPrice = Math.max(...prices);
      
      await prisma.product.update({
        where: { id: product.id },
        data: { highestPrice }
      });
    }
    
    count++;
    if (count % 1000 === 0) {
      console.log(`Processed ${count}/${products.length} products...`);
    }
  }
  
  console.log('Migration finished successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
