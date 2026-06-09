// src/app/api/bonds/route.ts
// Lists and writes bond records to the PostgreSQL database

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const address = searchParams.get("address");

        if (!address) {
            return NextResponse.json({ error: "Missing address" }, { status: 400 });
        }

        const addr = address.toLowerCase();

        const bonds = await db.bond.findMany({
            where: {
                OR: [{ initiatorAddress: addr }, { counterpartyAddress: addr }],
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        return NextResponse.json({ success: true, bonds });
    } catch (error) {
        console.error("Bonds fetch error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch bonds" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const {
            id,
            initiatorAddress,
            counterpartyAddress,
            initiatorAgentId,
            counterpartyAgentId,
            collateral,
            initiatorSplit,
            counterpartySplit,
            status,
            txHash,
        } = await req.json();

        if (
            !id ||
            !initiatorAddress ||
            !counterpartyAddress ||
            initiatorAgentId === undefined ||
            counterpartyAgentId === undefined ||
            !collateral ||
            initiatorSplit === undefined ||
            !txHash
        ) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const split = Number(initiatorSplit);
        const now = Math.floor(Date.now() / 1000);

        const bond = await db.bond.upsert({
            where: { id: String(id) },
            update: { status: Number(status ?? 0) },
            create: {
                id: String(id),
                initiatorAddress: String(initiatorAddress).toLowerCase(),
                counterpartyAddress: String(counterpartyAddress).toLowerCase(),
                initiatorAgentId: String(initiatorAgentId),
                counterpartyAgentId: String(counterpartyAgentId),
                collateral: String(collateral),
                initiatorSplit: split,
                counterpartySplit:
                    counterpartySplit === undefined ? 10000 - split : Number(counterpartySplit),
                status: Number(status ?? 0),
                createdAt: now,
                txHash,
            },
        });

        return NextResponse.json({ success: true, bond });
    } catch (error) {
        console.error("Bonds write error:", error);
        return NextResponse.json({ success: false, error: "Failed to record bond" }, { status: 500 });
    }
}
