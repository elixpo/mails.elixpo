/**
 * app/api/billing/razorpay/cancel/route.ts
 * Cancels a Razorpay subscription at end of current period.
 * Requires: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 */

import { type NextRequest, NextResponse } from "next/server";

function razorpayAuthHeader(): string {
    const keyId = process.env.RAZORPAY_KEY_ID ?? "";
    const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
    return `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`;
}

export async function POST(req: NextRequest) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return NextResponse.json({ error: "Razorpay not configured." }, { status: 503 });
    }

    const { subscriptionId } = (await req.json().catch(() => ({ subscriptionId: null }))) as {
        subscriptionId?: string | null;
    };
    if (!subscriptionId) {
        return NextResponse.json({ error: "No subscription found." }, { status: 400 });
    }

    try {
        // cancel_at_cycle_end=1 means cancel at end of current billing period
        const res = await fetch(
            `https://api.razorpay.com/v1/subscriptions/${subscriptionId}/cancel`,
            {
                method: "POST",
                headers: {
                    Authorization: razorpayAuthHeader(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ cancel_at_cycle_end: 1 }),
            },
        );

        if (!res.ok) {
            const err = (await res.json()) as { error?: { description?: string } };
            return NextResponse.json(
                { error: err?.error?.description ?? "Cancellation failed." },
                { status: 502 },
            );
        }

        return NextResponse.json({ cancelled: true });
    } catch (err) {
        console.error("[razorpay/cancel] error:", err);
        return NextResponse.json({ error: "Failed to cancel subscription." }, { status: 500 });
    }
}
