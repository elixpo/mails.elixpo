/**
 * app/api/billing/razorpay/checkout/route.ts
 *
 * Creates a Razorpay Subscription for INR recurring billing.
 * Uses the Subscriptions API (not one-off Orders) so that UPI AutoPay /
 * e-mandate / card mandates are handled automatically by Razorpay.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  SECRETS REQUIRED (Cloudflare Pages → Settings → Variables)          │
 * │                                                                      │
 * │  RAZORPAY_KEY_ID             rzp_live_…                              │
 * │  RAZORPAY_KEY_SECRET         (from Razorpay Dashboard → Settings)    │
 * │                                                                      │
 * │  RAZORPAY_PLAN_PRO_MONTHLY   plan_…  (₹1,599/mo)                    │
 * │  RAZORPAY_PLAN_PRO_YEARLY    plan_…  (₹15,990/yr billed upfront)    │
 * │  RAZORPAY_PLAN_SCALE_MONTHLY plan_…  (₹7,999/mo)                    │
 * │  RAZORPAY_PLAN_SCALE_YEARLY  plan_…  (₹79,980/yr billed upfront)    │
 * │                                                                      │
 * │  How to create Razorpay Subscription Plans:                          │
 * │  Dashboard → Subscriptions → Plans → Create Plan                     │
 * │  → period: monthly, interval: 1, item.amount in paise                │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * RBI e-mandate compliance:
 *  - Use the Subscriptions API with notify_info to trigger pre-debit
 *    notifications (required for amounts over ₹15,000).
 *  - For amounts ≤ ₹15,000 (Pro monthly), Razorpay handles seamless mandate.
 *  - Razorpay sends the pre-debit email/SMS automatically when notify_info
 *    is set; no additional action needed from our webhook.
 */

import type { BillingCycle, PlanId } from "@/lib/plans";
import { getPlan } from "@/lib/plans";
import { type NextRequest, NextResponse } from "next/server";

// Razorpay plan ID map (populated from env at runtime)
function getRazorpayPlanId(planId: PlanId, cycle: BillingCycle): string | null {
    const map: Partial<Record<string, string | undefined>> = {
        "pro:monthly": process.env.RAZORPAY_PLAN_PRO_MONTHLY,
        "pro:yearly": process.env.RAZORPAY_PLAN_PRO_YEARLY,
        "scale:monthly": process.env.RAZORPAY_PLAN_SCALE_MONTHLY,
        "scale:yearly": process.env.RAZORPAY_PLAN_SCALE_YEARLY,
    };
    return map[`${planId}:${cycle}`] ?? null;
}

function razorpayAuthHeader(): string {
    const keyId = process.env.RAZORPAY_KEY_ID ?? "";
    const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
    return `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`;
}

export async function POST(req: NextRequest) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        return NextResponse.json(
            { error: "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." },
            { status: 503 },
        );
    }

    let planId: PlanId;
    let cycle: BillingCycle;
    try {
        ({ planId, cycle } = (await req.json()) as { planId: PlanId; cycle: BillingCycle });
    } catch {
        return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (planId === "starter" || planId === "enterprise") {
        return NextResponse.json(
            { error: "This plan doesn't use Razorpay checkout." },
            { status: 400 },
        );
    }

    const rzpPlanId = getRazorpayPlanId(planId, cycle);
    if (!rzpPlanId) {
        return NextResponse.json(
            {
                error: `Razorpay plan ID not configured. Set RAZORPAY_PLAN_${planId.toUpperCase()}_${cycle.toUpperCase()}.`,
            },
            { status: 503 },
        );
    }

    const plan = getPlan(planId);

    try {
        // Create a Razorpay Subscription (recurring e-mandate)
        const rzpRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
            method: "POST",
            headers: {
                Authorization: razorpayAuthHeader(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                plan_id: rzpPlanId,
                // total_count: how many billing cycles before auto-expiry
                // monthly = up to 120 months (10 years), yearly = up to 12 years
                total_count: cycle === "yearly" ? 12 : 120,
                quantity: 1,
                // notify_info triggers pre-debit SMS/email (RBI e-mandate requirement)
                // TODO: populate from authenticated user's profile
                notify_info: {
                    notify_phone: null, // e.g. "9000000000"
                    notify_email: null, // e.g. "user@example.com"
                },
                notes: {
                    planId,
                    cycle,
                    currency: "INR",
                    source: "mails.elixpo.com",
                },
            }),
        });

        if (!rzpRes.ok) {
            const errBody = (await rzpRes.json()) as { error?: { description?: string } };
            console.error("[razorpay/checkout] Razorpay API error:", errBody);
            return NextResponse.json(
                { error: errBody?.error?.description ?? "Razorpay error. Please try again." },
                { status: 502 },
            );
        }

        const subscription = (await rzpRes.json()) as { id?: string };

        return NextResponse.json({
            subscriptionId: subscription.id,
            keyId, // Client needs this to open Razorpay Checkout
            planName: plan.name,
        });
    } catch (err) {
        console.error("[razorpay/checkout] error:", err);
        return NextResponse.json(
            { error: "Failed to create Razorpay subscription." },
            { status: 500 },
        );
    }
}
