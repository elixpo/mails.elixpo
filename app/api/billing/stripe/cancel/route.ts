/**
 * app/api/billing/stripe/cancel/route.ts
 *
 * Cancels a Stripe subscription at the end of the current period.
 * Requires: STRIPE_SECRET_KEY
 */

import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
    }

    // TODO: get subscriptionId from the authenticated session / D1
    // const { subscriptionId } = await req.json();
    // const subscriptionId = await getSubscriptionIdFromSession(req);

    const { subscriptionId } = (await req.json().catch(() => ({ subscriptionId: null }))) as {
        subscriptionId?: string | null;
    };
    if (!subscriptionId) {
        return NextResponse.json({ error: "No subscription found." }, { status: 400 });
    }

    try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(secretKey);

        // Cancel at period end — user keeps access until renewal date
        await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });

        return NextResponse.json({ cancelled: true });
    } catch (err) {
        console.error("[stripe/cancel] error:", err);
        return NextResponse.json({ error: "Failed to cancel subscription." }, { status: 500 });
    }
}
