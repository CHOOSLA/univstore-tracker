-- AddColumn
ALTER TABLE "Product" ADD COLUMN "priceScore" INTEGER;

-- Backfill: 기존 33k 상품 priceScore 계산
UPDATE "Product"
SET "priceScore" = CASE
  WHEN "highestPrice" IS NULL OR "lowestPrice" IS NULL OR "currentPrice" IS NULL THEN NULL
  WHEN "highestPrice" = "lowestPrice" THEN 50
  ELSE GREATEST(0, LEAST(100, ROUND(("highestPrice" - "currentPrice")::numeric * 100 / NULLIF("highestPrice" - "lowestPrice", 0))::int))
END;
