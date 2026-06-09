/*
  Warnings:

  - You are about to drop the column `bondId` on the `Bond` table. All the data in the column will be lost.
  - You are about to drop the column `counterparty` on the `Bond` table. All the data in the column will be lost.
  - You are about to drop the column `initiator` on the `Bond` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `ReputationEvent` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `ReputationEvent` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[txHash]` on the table `ReputationEvent` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `counterpartyAddress` to the `Bond` table without a default value. This is not possible if the table is not empty.
  - Added the required column `initiatorAddress` to the `Bond` table without a default value. This is not possible if the table is not empty.
  - Made the column `initiatorAgentId` on table `Bond` required. This step will fail if there are existing NULL values in that column.
  - Made the column `counterpartyAgentId` on table `Bond` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `status` on the `Bond` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `delta` to the `ReputationEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timestamp` to the `ReputationEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `txHash` to the `ReputationEvent` table without a default value. This is not possible if the table is not empty.
  - Made the column `reason` on table `ReputationEvent` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ReputationEvent" DROP CONSTRAINT "ReputationEvent_agentId_fkey";

-- DropIndex
DROP INDEX "Bond_bondId_key";

-- AlterTable
ALTER TABLE "Bond" DROP COLUMN "bondId",
DROP COLUMN "counterparty",
DROP COLUMN "initiator",
ADD COLUMN     "counterpartyAddress" TEXT NOT NULL,
ADD COLUMN     "initiatorAddress" TEXT NOT NULL,
ALTER COLUMN "initiatorAgentId" SET NOT NULL,
ALTER COLUMN "counterpartyAgentId" SET NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "bondId" TEXT;

-- AlterTable
ALTER TABLE "ReputationEvent" DROP COLUMN "createdAt",
DROP COLUMN "score",
ADD COLUMN     "delta" INTEGER NOT NULL,
ADD COLUMN     "timestamp" INTEGER NOT NULL,
ADD COLUMN     "txHash" TEXT NOT NULL,
ALTER COLUMN "reason" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ReputationEvent_txHash_key" ON "ReputationEvent"("txHash");
