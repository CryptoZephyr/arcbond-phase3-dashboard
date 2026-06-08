// src/app/api/withdraw/route.ts
// Phase 4 - Real withdraw using Circle Gateway

import { NextRequest, NextResponse } from "next/server";
import { withdrawFromLedger } from "@/lib/wallet-operations";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { agentAddress, amountUsdc, recipientAddress, userId } = await req.json();

        if (!agentAddress || !amountUsdc || !recipientAddress || !userId) {
            return NextResponse.json(
                {
                    error:
                        "Missing required fields: agentAddress, amountUsdc, recipientAddress, userId",
                },
                { status: 400 }
            );
        }

        if (isNaN(parseFloat(amountUsdc)) || parseFloat(amountUsdc) <= 0) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }

        if (
            !recipientAddress.startsWith("0x") ||
            recipientAddress.length !== 42
        ) {
            return NextResponse.json(
                { error: "Invalid recipient address" },
                { status: 400 }
            );
        }

        // Execute real withdrawal via Gateway
        const result = await withdrawFromLedger(
            agentAddress,
            amountUsdc,
            recipientAddress
        );
        const now = Math.floor(Date.now() / 1000);
        const lowerUserId = userId.toLowerCase();

        await db.user.upsert({
            where: { walletAddress: lowerUserId },
            update: { lastLogin: now },
            create: { walletAddress: lowerUserId, registeredAt: now, lastLogin: now },
        });

        await db.transaction.upsert({
            where: { txHash: result.txHash },
            update: { status: result.status },
            create: {
                userId: lowerUserId,
                type: "WITHDRAW",
                amount: amountUsdc,
                fromAddress: agentAddress,
                toAddress: recipientAddress,
                txHash: result.txHash,
                status: result.status,
                timestamp: now,
            },
        });

        return NextResponse.json(
            {
                success: true,
                txHash: result.txHash,
                status: result.status,
                message: `Withdrawal of ${amountUsdc} USDC initiated`,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Withdraw endpoint error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Withdrawal failed",
            },
            { status: 500 }
        );
    }
}
