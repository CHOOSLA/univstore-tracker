/*
  Warnings:

  - A unique constraint covering the columns `[productId,type]` on the table `DataIssue` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "DataIssue_productId_type_key" ON "DataIssue"("productId", "type");
