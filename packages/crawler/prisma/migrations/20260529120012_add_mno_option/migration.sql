-- CreateTable
CREATE TABLE "MnoOption" (
    "productId" TEXT NOT NULL,
    "deviceColors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deviceCapacities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "registrationTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "baseColor" TEXT,
    "baseCapacity" TEXT,
    "phonePlans" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MnoOption_pkey" PRIMARY KEY ("productId")
);

-- AddForeignKey
ALTER TABLE "MnoOption" ADD CONSTRAINT "MnoOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

┌─────────────────────────────────────────────────────────┐
│  Update available 5.22.0 -> 7.8.0                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘
