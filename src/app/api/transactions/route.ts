// src/app/api/transactions/route.ts
// Handles both listing and writing transaction log records to the SQLite database

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        const transactions = await db.transaction.findMany({
            where: { userId: userId.toLowerCase() },
            orderBy: { timestamp: "desc" },
            take: 10,
        });

        return NextResponse.json({
            success: true,
            transactions,
        });
    } catch (error) {
        console.error("Transactions fetch error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch transactions" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId, type, amount, fromAddress, toAddress, txHash, status, sourceChain } = await req.json();

        if (!userId || !type || !amount || !fromAddress || !toAddress || !txHash || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const now = Math.floor(Date.now() / 1000);

        // Ensure user profile exists in database before writing transaction
        await db.user.upsert({
            where: { walletAddress: userId.toLowerCase() },
            update: { lastLogin: now },
            create: { walletAddress: userId.toLowerCase(), registeredAt: now, lastLogin: now }
        });

        const transaction = await db.transaction.upsert({
            where: { txHash },
            update: { status },
            create: {
                userId: userId.toLowerCase(),
                type,
                amount,
                fromAddress,
                toAddress,
                txHash,
                status,
                timestamp: now,
                sourceChain,
            },
        });

        return NextResponse.json({
            success: true,
            transaction
        });
    } catch (error) {
        console.error("Transactions write error:", error);
        return NextResponse.json({ success: false, error: "Failed to record transaction" }, { status: 500 });
    }
}