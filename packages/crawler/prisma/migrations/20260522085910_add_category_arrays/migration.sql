-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "menuCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "menuSubCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "thirdCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
