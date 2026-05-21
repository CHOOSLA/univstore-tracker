-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "menuCategory" TEXT,
ADD COLUMN     "menuSubCategory" TEXT;

-- CreateIndex
CREATE INDEX "Product_menuCategory_menuSubCategory_idx" ON "Product"("menuCategory", "menuSubCategory");
