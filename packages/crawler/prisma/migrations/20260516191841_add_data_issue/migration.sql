-- CreateTable
CREATE TABLE "DataIssue" (
    "id" SERIAL NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataIssue_productId_idx" ON "DataIssue"("productId");

-- CreateIndex
CREATE INDEX "DataIssue_type_idx" ON "DataIssue"("type");
