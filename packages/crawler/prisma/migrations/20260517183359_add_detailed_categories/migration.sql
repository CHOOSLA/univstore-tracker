-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "subCategory" TEXT,
ADD COLUMN     "thirdCategory" TEXT;

-- CreateIndex
CREATE INDEX "Product_brand_idx" ON "Product"("brand");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_subCategory_idx" ON "Product"("subCategory");
