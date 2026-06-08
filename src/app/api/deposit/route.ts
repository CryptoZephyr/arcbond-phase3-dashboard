// src/app/api/deposit/route.ts
// Phase 4 - Real deposit using Circle Gateway

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { txHash, status, amountUsdc, userId, agentAddress } = await req.json();

        if (!agentAddress || !amountUsdc || !userId) {
            return NextResponse.json(
                { error: "Missing agentAddress, amountUsdc, or userId" },
                { status: 400 }
            );
        }

        if (isNaN(parseFloat(amountUsdc)) || parseFloat(amountUsdc) <= 0) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }

        const now = Math.floor(Date.now() / 1000);
        const lowerUserId = userId.toLowerCase();
        const finalStatus = status || "CONFIRMED";

        await db.user.upsert({
            where: { walletAddress: lowerUserId },
            update: { lastLogin: now },
            create: { walletAddress: lowerUserId, registeredAt: now, lastLogin: now },
        });

        await db.transaction.upsert({
            where: { txHash: txHash },
            update: { status: finalStatus },
            create: {
                userId: lowerUserId,
                type: "DEPOSIT",
                amount: amountUsdc,
                fromAddress: agentAddress,
                toAddress: agentAddress,
                txHash: txHash,
                status: finalStatus,
                timestamp: now,
            },
        });

        return NextResponse.json(
            {
                success: true,
                txHash: txHash,
                status: finalStatus,
                message: `Deposit of ${amountUsdc} USDC logged successfully`,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Deposit endpoint error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Deposit failed",
            },
            { status: 500 }
        );
    }
}
