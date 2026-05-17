-- CreateTable
CREATE TABLE "BenefitRule" (
    "id" SERIAL NOT NULL,
    "pattern" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "maxLimit" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BenefitRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BenefitRule_pattern_key" ON "BenefitRule"("pattern");
