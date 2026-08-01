/**
 * app/api/billing/stripe/checkout/route.ts
 *
 * Creates a Stripe Checkout Session for USD subscriptions.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  SECRETS REQUIRED (Cloudflare Pages → Settings → Variables) │
 * │                                                             │
 * │  STRIPE_SECRET_KEY        sk_live_…  (or sk_test_… for dev) │
 * │  STRIPE_PRICE_PRO_MONTHLY price_…                           │
 * │  STRIPE_PRICE_PRO_YEARLY  price_…                           │
 * │  STRIPE_PRICE_SCALE_MONTHLY price_…                         │
 * │  STRIPE_PRICE_SCALE_YEARLY  price_…                         │
 * │  NEXT_PUBLIC_APP_URL      https://mails.elixpo.com          │
 * └─────────────────────────────────────────────────────────────┘
 *
 * How to get Stripe Price IDs:
 *  1. Go to Stripe Dashboard → Products → Create product for each plan
 *  2. Add two prices (monthly recurring + yearly recurring)
 *  3. Copy the price_… ID and put it in env
 */

import type { BillingCycle, PlanId } from "@/lib/plans";
import { type NextRequest, NextResponse } from "next/server";

// Price ID map — populated from environment variables at runtime
function getStripePriceId(planId: PlanId, cycle: BillingCycle): string | null {
    const map: Partial<Record<string, string | undefined>> = {
        "pro:monthly": process.env.STRIPE_PRICE_PRO_MONTHLY,
        "pro:yearly": process.env.STRIPE_PRICE_PRO_YEARLY,
        "scale:monthly": process.env.STRIPE_PRICE_SCALE_MONTHLY,
        "scale:yearly": process.env.STRIPE_PRICE_SCALE_YEARLY,
    };
    return map[`${planId}:${cycle}`] ?? null;
}

export async function POST(req: NextRequest) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // Guard: not configured
    if (!secretKey) {
        return NextResponse.json(
            { error: "Stripe is not configured yet. Set STRIPE_SECRET_KEY." },
            { status: 503 },
        );
    }

    // Parse body
    let planId: PlanId;
    let cycle: BillingCycle;
    try {
        ({ planId, cycle } = (await req.json()) as { planId: PlanId; cycle: BillingCycle });
    } catch {
        return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    // Only paid plans go through Stripe
    if (planId === "starter" || planId === "enterprise") {
        return NextResponse.json(
            { error: "This plan doesn't use Stripe checkout." },
            { status: 400 },
        );
    }

    const priceId = getStripePriceId(planId, cycle);
    if (!priceId) {
        return NextResponse.json(
            {
                error: `Stripe price ID not configured. Set STRIPE_PRICE_${planId.toUpperCase()}_${cycle.toUpperCase()}.`,
            },
            { status: 503 },
        );
    }

    try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(secretKey);

        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            line_items: [{ price: priceId, quantity: 1 }],
            // TODO: pass customer email once auth session is available
            // customer_email: session.user.email,
            allow_promotion_codes: true,
            billing_address_collection: "auto",
            success_url: `${appUrl}/dashboard/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/pricing?status=cancelled`,
            metadata: { planId, cycle, currency: "USD" },
            subscription_data: {
                metadata: { planId, cycle },
                // trial_period_days: 14, // Uncomment to enable 14-day free trial
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (err) {
        console.error("[stripe/checkout] error:", err);
        return NextResponse.json(
            { error: "Failed to create checkout session. Please try again." },
            { status: 500 },
        );
    }
}
