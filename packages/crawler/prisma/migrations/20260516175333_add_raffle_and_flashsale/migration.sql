-- CreateTable
CREATE TABLE "Raffle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "entries" INTEGER NOT NULL DEFAULT 0,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "winners" INTEGER NOT NULL DEFAULT 1,
    "prob" TEXT,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Ongoing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Raffle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashSale" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "discount" TEXT,
    "stock" INTEGER,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Upcoming',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashSale_pkey" PRIMARY KEY ("id")
);
