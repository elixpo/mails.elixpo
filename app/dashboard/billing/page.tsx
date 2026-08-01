"use client";

/**
 * app/dashboard/billing/page.tsx
 *
 * Improvements over v1:
 * - Sectioned layout: Plan → Usage → Invoices → Danger zone
 * - Animated usage bar with colour coding (green → amber → red)
 * - "Days until reset" shown below usage bar
 * - Upgrade banner shown when approaching limit (>80%)
 * - Plan limits surface as readable sentences, not raw numbers
 * - Cancel flow with confirmation and "undo" window explanation
 * - Accessible status badges with aria-label
 * - All mock data clearly labelled with TODO for D1 wiring
 * - Manages both Stripe and Razorpay subscriptions
 */

import { PLANS, type PlanId, formatCurrency } from "@/lib/plans";
import type { Subscription, UsageStats } from "@/lib/subscription";
import Link from "next/link";
import { useState } from "react";

// ─── Mock data — replace with D1 queries ─────────────────────────────────────
// In production these come from:
//   await db.prepare('SELECT * FROM subscriptions WHERE tenant_id = ?').bind(tenantId).first()
//   await db.prepare('SELECT COUNT(*) as n FROM delivery_log WHERE tenant_id=? AND sent_at > ?')
//            .bind(tenantId, periodStart).first()

const MOCK_SUBSCRIPTION: Subscription = {
    planId: "starter",
    cycle: "monthly",
    currency: "USD",
    status: "none",
    currentPeriodEnd: null,
    subscriptionId: null,
    provider: null,
};

const now = new Date();
const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

const MOCK_USAGE: UsageStats = {
    sendsUsed: 0,
    sendsAllowed: 1000,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillingPage() {
    const [sub] = useState<Subscription>(MOCK_SUBSCRIPTION);
    const [usage] = useState<UsageStats>(MOCK_USAGE);

    const plan = PLANS.find((p) => p.id === sub.planId) ?? PLANS[0];
    const usagePct =
        usage.sendsAllowed > 0
            ? Math.min(100, Math.round((usage.sendsUsed / usage.sendsAllowed) * 100))
            : 0;

    const daysLeft = Math.max(
        0,
        Math.ceil((new Date(usage.periodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    );

    const approachingLimit =
        usagePct >= 80 && sub.planId !== "scale" && sub.planId !== "enterprise";
    const isActive = sub.status === "active" || sub.status === "trialing";

    return (
        <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
            {/* ── Page title ── */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Billing & plan</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Manage your subscription, usage, and invoices.
                </p>
            </div>

            {/* ── Upgrade banner (approaching limit or past due) ── */}
            {(approachingLimit || sub.status === "past_due") && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 flex items-start gap-3">
                    <span className="text-amber-500 mt-0.5 text-lg" aria-hidden>
                        ⚠
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                            {sub.status === "past_due"
                                ? "Your last payment failed."
                                : `You've used ${usagePct}% of your monthly sends.`}
                        </p>
                        <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                            {sub.status === "past_due"
                                ? "Update your payment method to keep your account active."
                                : "Upgrade to Pro or Scale to keep sending without interruption."}
                        </p>
                    </div>
                    <Link
                        href="/pricing"
                        className="shrink-0 text-xs font-semibold text-amber-800 dark:text-amber-300 underline underline-offset-2"
                    >
                        Upgrade
                    </Link>
                </div>
            )}

            {/* ── Current plan ── */}
            <Section title="Plan">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-lg">{plan.name}</p>
                            <StatusBadge status={sub.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">{plan.tagline}</p>

                        {/* Plan meta when active */}
                        {sub.status !== "none" && (
                            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                                <MetaItem
                                    label="Cycle"
                                    value={sub.cycle === "monthly" ? "Monthly" : "Yearly"}
                                />
                                <MetaItem label="Currency" value={sub.currency} />
                                {sub.currentPeriodEnd && (
                                    <MetaItem
                                        label={
                                            sub.status === "canceled" ? "Access until" : "Renews"
                                        }
                                        value={new Date(sub.currentPeriodEnd).toLocaleDateString(
                                            "en-GB",
                                            {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            },
                                        )}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 items-end shrink-0">
                        <Link
                            href="/pricing"
                            className="text-sm font-medium underline underline-offset-2 hover:no-underline"
                        >
                            {sub.status === "none" ? "Choose a plan →" : "Change plan →"}
                        </Link>
                        {isActive && sub.provider && sub.subscriptionId && (
                            <CancelButton
                                provider={sub.provider}
                                subscriptionId={sub.subscriptionId}
                            />
                        )}
                    </div>
                </div>
            </Section>

            {/* ── Usage ── */}
            <Section title="Usage this period">
                <div className="space-y-3">
                    {/* Sends meter */}
                    <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="font-medium">Email sends</span>
                            <span className="tabular-nums text-muted-foreground">
                                {usage.sendsUsed.toLocaleString()} /{" "}
                                {usage.sendsAllowed.toLocaleString()}
                            </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                                role="progressbar"
                                aria-valuenow={usagePct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`${usagePct}% of monthly sends used`}
                                className={`h-full rounded-full transition-all duration-700 ${
                                    usagePct >= 90
                                        ? "bg-red-500"
                                        : usagePct >= 70
                                          ? "bg-amber-400"
                                          : "bg-emerald-500"
                                }`}
                                style={{ width: `${usagePct}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                            <span>{usagePct}% used</span>
                            <span>
                                Resets in {daysLeft} day{daysLeft !== 1 ? "s" : ""} ·{" "}
                                {new Date(usage.periodEnd).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                })}
                            </span>
                        </div>
                    </div>

                    {/* Plan limits summary */}
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        {[
                            {
                                label: "Products",
                                value:
                                    plan.limits.products === null
                                        ? "Unlimited"
                                        : plan.limits.products,
                            },
                            {
                                label: "Sender mailboxes",
                                value:
                                    plan.limits.senders === null
                                        ? "Unlimited"
                                        : plan.limits.senders,
                            },
                            {
                                label: "Templates",
                                value:
                                    plan.limits.templates === null
                                        ? "Unlimited"
                                        : plan.limits.templates,
                            },
                            {
                                label: "Sends / month",
                                value:
                                    plan.limits.sendsPerMonth === null
                                        ? "Unlimited"
                                        : plan.limits.sendsPerMonth.toLocaleString(),
                            },
                        ].map(({ label, value }) => (
                            <div
                                key={label}
                                className="rounded-lg bg-muted/50 border border-border px-3 py-2"
                            >
                                <p className="text-xs text-muted-foreground">{label}</p>
                                <p className="font-medium text-sm mt-0.5">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* ── Invoices ── */}
            <Section title="Invoices">
                {/* TODO: fetch invoices from Stripe (stripe.invoices.list) or
            Razorpay (GET /v1/invoices?subscription_id=…) and render here */}
                <div className="text-center py-8 text-sm text-muted-foreground">
                    <p className="mb-1">No invoices yet.</p>
                    <p>
                        Invoices appear here after your first payment.{" "}
                        {sub.planId === "starter" && (
                            <Link href="/pricing" className="underline underline-offset-2">
                                Upgrade to get started.
                            </Link>
                        )}
                    </p>
                </div>
            </Section>

            {/* ── Danger zone ── */}
            {isActive && (
                <Section title="Danger zone">
                    <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                            Delete account
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-400 mb-3">
                            Permanently deletes your account and all associated data. This cannot be
                            undone.
                        </p>
                        <button
                            className="text-xs font-semibold text-red-600 dark:text-red-400 underline underline-offset-2 hover:no-underline"
                            onClick={() =>
                                alert("To delete your account, contact support@elixpo.com")
                            }
                        >
                            Request account deletion
                        </button>
                    </div>
                </Section>
            )}
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                {title}
            </h2>
            {children}
        </div>
    );
}

function MetaItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <span className="text-muted-foreground">{label}: </span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

function StatusBadge({ status }: { status: Subscription["status"] }) {
    const styles: Record<Subscription["status"], string> = {
        active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        past_due: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        canceled: "bg-muted text-muted-foreground",
        trialing: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
        none: "bg-muted text-muted-foreground",
    };

    const labels: Record<Subscription["status"], string> = {
        active: "Active",
        past_due: "Payment overdue",
        canceled: "Cancelled",
        trialing: "Free trial",
        none: "Free plan",
    };

    return (
        <span
            aria-label={`Subscription status: ${labels[status]}`}
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${styles[status]}`}
        >
            {labels[status]}
        </span>
    );
}

// ─── Cancel button ────────────────────────────────────────────────────────────

interface CancelButtonProps {
    provider: "stripe" | "razorpay";
    subscriptionId: string;
}

function CancelButton({ provider, subscriptionId }: CancelButtonProps) {
    const [state, setState] = useState<"idle" | "confirming" | "loading" | "done">("idle");

    async function handleCancel() {
        if (state === "idle") {
            setState("confirming");
            return;
        }

        setState("loading");
        try {
            const res = await fetch(`/api/billing/${provider}/cancel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscriptionId }),
            });

            if (!res.ok) {
                const { error } = (await res.json()) as { error?: string };
                throw new Error(error ?? "Cancellation failed.");
            }

            setState("done");
        } catch (err) {
            alert((err as Error).message);
            setState("idle");
        }
    }

    if (state === "done") {
        return (
            <p className="text-xs text-muted-foreground text-right">
                Cancellation scheduled — access continues until period end.
            </p>
        );
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={handleCancel}
                disabled={state === "loading"}
                className="text-xs text-muted-foreground hover:text-red-500 underline underline-offset-2 transition-colors disabled:opacity-60"
            >
                {state === "loading"
                    ? "Cancelling…"
                    : state === "confirming"
                      ? "Confirm cancel"
                      : "Cancel subscription"}
            </button>
            {state === "confirming" && (
                <p className="text-[11px] text-muted-foreground text-right max-w-[180px]">
                    You&apos;ll keep access until the end of your billing period.{" "}
                    <button
                        onClick={() => setState("idle")}
                        className="underline underline-offset-2"
                    >
                        Undo
                    </button>
                </p>
            )}
        </div>
    );
}
