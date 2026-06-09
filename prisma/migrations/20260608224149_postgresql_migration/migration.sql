-- CreateTable
CREATE TABLE "User" (
    "walletAddress" TEXT NOT NULL,
    "ensName" TEXT,
    "registeredAt" INTEGER NOT NULL,
    "lastLogin" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("walletAddress")
);

-- CreateTable
CREATE TABLE "UserAgent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "registeredAt" INTEGER NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "UserAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "sourceChain" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReputationEvent" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" INTEGER NOT NULL,

    CONSTRAINT "ReputationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "clientAddress" TEXT NOT NULL,
    "providerAddress" TEXT NOT NULL,
    "evaluatorAddress" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budget" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expiredAt" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "createdAt" INTEGER NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bond" (
    "id" TEXT NOT NULL,
    "bondId" TEXT,
    "initiatorAgentId" TEXT,
    "counterpartyAgentId" TEXT,
    "initiator" TEXT,
    "counterparty" TEXT NOT NULL,
    "collateral" TEXT NOT NULL,
    "initiatorSplit" INTEGER NOT NULL,
    "counterpartySplit" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "txHash" TEXT NOT NULL,
    "createdAt" INTEGER NOT NULL,

    CONSTRAINT "Bond_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_txHash_key" ON "Transaction"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "Job_txHash_key" ON "Job"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "Bond_bondId_key" ON "Bond"("bondId");

-- CreateIndex
CREATE UNIQUE INDEX "Bond_txHash_key" ON "Bond"("txHash");

-- AddForeignKey
ALTER TABLE "UserAgent" ADD CONSTRAINT "UserAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("walletAddress") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("walletAddress") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationEvent" ADD CONSTRAINT "ReputationEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "UserAgent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
