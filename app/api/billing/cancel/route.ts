export const runtime = "edge";

import { getTenantSubscription, updateTenantSubscription } from "@/lib/billing";
import { getDatabase } from "@/lib/d1-client";
import { cancelRazorpaySubscription } from "@/lib/payments/razorpay";
import { cancelStripeSubscription } from "@/lib/payments/stripe";
import { getSession } from "@/lib/session";
import { requireWriteRole } from "@/lib/workspace-guard";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const denied = await requireWriteRole(session);
    if (denied) return denied;

    const db = await getDatabase();
    const sub = await getTenantSubscription(db, session.tenantId);

    if (sub.plan === "starter") {
        return NextResponse.json(
            { error: "already_free", message: "Workspace is already on the free Starter plan." },
            { status: 400 },
        );
    }

    try {
        if (sub.paymentProvider === "stripe" && sub.subscriptionId) {
            await cancelStripeSubscription(sub.subscriptionId);
        } else if (sub.paymentProvider === "razorpay" && sub.subscriptionId) {
            await cancelRazorpaySubscription(sub.subscriptionId);
        }

        await updateTenantSubscription(db, session.tenantId, {
            cancelAtPeriodEnd: true,
        });

        return NextResponse.json({
            ok: true,
            message:
                "Your subscription has been scheduled for cancellation at the end of the billing period.",
        });
    } catch (e: any) {
        return NextResponse.json(
            { error: "cancel_failed", message: e?.message || "Failed to cancel subscription" },
            { status: 500 },
        );
    }
}
