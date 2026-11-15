export const runtime = "edge";

import { recordInvoice, updateTenantSubscription } from "@/lib/billing";
import { getDatabase } from "@/lib/d1-client";
import { type BillingCycle, type Currency, PLANS, type PlanId } from "@/lib/plans";
import { getSession } from "@/lib/session";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const session = await getSession(request);
    const searchParams = request.nextUrl.searchParams;

    const tenantId = searchParams.get("tenant_id") || session?.tenantId;
    if (!tenantId) {
        return NextResponse.redirect(
            new URL("/dashboard/billing?error=missing_tenant", request.url),
        );
    }

    const plan = (searchParams.get("plan") || "pro") as PlanId;
    const cycle = (searchParams.get("cycle") === "yearly" ? "yearly" : "monthly") as BillingCycle;
    const currency = (searchParams.get("currency") === "INR" ? "INR" : "USD") as Currency;
    const provider = searchParams.get("provider") === "razorpay" ? "razorpay" : "stripe";
    const subId =
        searchParams.get("subscription_id") ||
        searchParams.get("session_id") ||
        `sim_${provider}_${Date.now()}`;

    const now = new Date();
    const periodStart = now.toISOString();
    const periodEndDate = new Date(now);
    if (cycle === "yearly") {
        periodEndDate.setFullYear(periodEndDate.getFullYear() + 1);
    } else {
        periodEndDate.setMonth(periodEndDate.getMonth() + 1);
    }
    const periodEnd = periodEndDate.toISOString();

    const planDef = PLANS[plan] || PLANS.pro;
    const pricing = planDef.pricing[currency] || planDef.pricing.USD;
    const amount = cycle === "yearly" ? pricing.yearlyAmount : pricing.amount;

    const db = await getDatabase();

    await updateTenantSubscription(db, tenantId, {
        plan,
        billingCycle: cycle,
        billingCurrency: currency,
        subscriptionId: subId,
        subscriptionStatus: "active",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        paymentProvider: provider,
        customerId: `sim_cust_${tenantId.slice(0, 8)}`,
    });

    await recordInvoice(db, {
        tenantId,
        provider,
        providerInvoiceId: `inv_${Date.now()}`,
        amount: currency === "USD" ? amount * 100 : amount * 100, // in cents / paise
        currency,
        status: "paid",
        paidAt: now.toISOString(),
        hostedInvoiceUrl: `/dashboard/billing?invoice_simulated=${subId}`,
    });

    return NextResponse.redirect(new URL("/dashboard/billing?checkout=success", request.url));
}
