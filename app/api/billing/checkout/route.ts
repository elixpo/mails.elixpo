export const runtime = "edge";

import { getTenantSubscription } from "@/lib/billing";
import { getDatabase } from "@/lib/d1-client";
import { createRazorpaySubscription } from "@/lib/payments/razorpay";
import { createStripeCheckoutSession } from "@/lib/payments/stripe";
import type { BillingCycle, Currency, PlanId } from "@/lib/plans";
import { getSession } from "@/lib/session";
import { requireWriteRole } from "@/lib/workspace-guard";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const denied = await requireWriteRole(session);
    if (denied) return denied;

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const plan = body?.plan as PlanId;
    const cycle = (body?.cycle === "yearly" ? "yearly" : "monthly") as BillingCycle;
    const currency = (body?.currency === "INR" ? "INR" : "USD") as Currency;

    if (plan !== "pro" && plan !== "scale") {
        return NextResponse.json(
            { error: "invalid_plan", message: "Only Pro and Scale plans require checkout." },
            { status: 400 },
        );
    }

    const db = await getDatabase();
    const sub = await getTenantSubscription(db, session.tenantId);

    try {
        if (currency === "INR") {
            const result = await createRazorpaySubscription({
                tenantId: session.tenantId,
                tenantName: sub.tenantName,
                email: session.email,
                plan,
                cycle,
                customerId: sub.customerId,
            });
            return NextResponse.json({ ok: true, ...result });
        }

        const result = await createStripeCheckoutSession({
            tenantId: session.tenantId,
            tenantName: sub.tenantName,
            email: session.email,
            plan,
            cycle,
            customerId: sub.customerId,
        });
        return NextResponse.json({ ok: true, ...result });
    } catch (e: any) {
        return NextResponse.json(
            {
                error: "checkout_failed",
                message: e?.message || "Failed to create checkout session",
            },
            { status: 500 },
        );
    }
}
