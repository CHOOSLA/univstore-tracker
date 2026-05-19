-- CreateTable
CREATE TABLE "DailyPick" (
    "id" SERIAL NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyPick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyPick_productId_key" ON "DailyPick"("productId");

-- AddForeignKey
ALTER TABLE "DailyPick" ADD CONSTRAINT "DailyPick_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
