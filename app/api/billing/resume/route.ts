export const runtime = "edge";

import { getTenantSubscription, updateTenantSubscription } from "@/lib/billing";
import { getDatabase } from "@/lib/d1-client";
import { resumeStripeSubscription } from "@/lib/payments/stripe";
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

    try {
        if (sub.paymentProvider === "stripe" && sub.subscriptionId) {
            await resumeStripeSubscription(sub.subscriptionId);
        }

        await updateTenantSubscription(db, session.tenantId, {
            cancelAtPeriodEnd: false,
        });

        return NextResponse.json({
            ok: true,
            message: "Your subscription will continue to renew automatically.",
        });
    } catch (e: any) {
        return NextResponse.json(
            { error: "resume_failed", message: e?.message || "Failed to resume subscription" },
            { status: 500 },
        );
    }
}
