"use client";

import type { SvgIconComponent } from "@mui/icons-material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BoltIcon from "@mui/icons-material/Bolt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CodeIcon from "@mui/icons-material/Code";
import DesignServicesIcon from "@mui/icons-material/DesignServices";
import EastIcon from "@mui/icons-material/East";
import HubIcon from "@mui/icons-material/Hub";
import InsightsIcon from "@mui/icons-material/Insights";
import LockIcon from "@mui/icons-material/Lock";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PasswordIcon from "@mui/icons-material/Password";
import PublicIcon from "@mui/icons-material/Public";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import WavingHandIcon from "@mui/icons-material/WavingHand";
import WebhookIcon from "@mui/icons-material/Webhook";
import { Box, Button, Container, Stack, Typography, Tooltip, IconButton } from "@mui/material";
import Link from "next/link";
import type React from "react";
import { useEffect, useState } from "react";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CodeBlock from "./components/code-block";
import PageShell from "./components/page-shell";
import PixelHero from "./components/pixel-hero";

const CORAL = "#ff7759";
const ACTION_BLUE = "#1863dc";
const INK = "#212121";
const SLATE = "#75758a";
const HAIRLINE = "#d9d9dd";

// Cohere primary CTA button styles
const PRIMARY_BTN = {
    textTransform: "none" as const,
    fontWeight: 500,
    fontSize: "0.95rem",
    color: "#fff",
    px: 3.5,
    py: 1.3,
    borderRadius: "32px", // Pill
    background: "#17171c",
    boxShadow: "none",
    fontFamily: "var(--font-sans)",
    "&:hover": { background: "#000000" },
};

// ── Section heading helper ──────────────────────────────────────────────────
function SectionHead({
    eyebrow,
    title,
    body,
    whiteText = false,
}: {
    eyebrow: string;
    title: React.ReactNode;
    body?: string;
    whiteText?: boolean;
}) {
    return (
        <Stack alignItems="center" textAlign="center" spacing={1.8} sx={{ mb: { xs: 5, md: 8 } }}>
            <Typography
                sx={{
                    color: whiteText ? "#ffad9b" : CORAL, // Soft Coral / Coral
                    fontWeight: 500,
                    fontSize: "0.78rem",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-mono)",
                }}
            >
                {eyebrow}
            </Typography>
            <Typography
                component="h2"
                sx={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    fontSize: { xs: "2rem", md: "2.8rem" },
                    letterSpacing: "-0.03em",
                    lineHeight: 1.05,
                    color: whiteText ? "#ffffff" : "#000000",
                    maxWidth: 720,
                }}
            >
                {title}
            </Typography>
            {body && (
                <Typography 
                    sx={{ 
                        maxWidth: 600, 
                        color: whiteText ? "rgba(255,255,255,0.7)" : SLATE, 
                        fontSize: "1.05rem", 
                        lineHeight: 1.6,
                        fontFamily: "var(--font-sans)",
                    }}
                >
                    {body}
                </Typography>
            )}
        </Stack>
    );
}

// ── Auth-aware primary CTA ──────────────────────────────────────────────────
function useAuthed(): boolean | null {
    const [authed, setAuthed] = useState<boolean | null>(null);
    useEffect(() => {
        let alive = true;
        fetch("/api/auth/me", { cache: "no-store" })
            .then((r) => r.json())
            .then((d: any) => alive && setAuthed(Boolean(d?.authenticated)))
            .catch(() => alive && setAuthed(false));
        return () => {
            alive = false;
        };
    }, []);
    return authed;
}

function PrimaryCta({ authed, signedOutLabel, sx }: { authed: boolean | null; signedOutLabel: string; sx?: any }) {
    const signedIn = authed === true;
    return (
        <Button
            component={signedIn ? Link : "a"}
            href={signedIn ? "/dashboard" : "/api/auth/login"}
            endIcon={<ArrowForwardIcon sx={{ fontSize: "1.1rem !important" }} />}
            sx={{ ...PRIMARY_BTN, ...sx }}
        >
            {signedIn ? "Go to your dashboard" : signedOutLabel}
        </Button>
    );
}

// ── Data ────────────────────────────────────────────────────────────────────
const STEPS: { icon: SvgIconComponent; title: string; body: string }[] = [
    {
        icon: VpnKeyIcon,
        title: "Connect a sender",
        body: "Add your mailbox — email + app password. Stored encrypted, never returned.",
    },
    {
        icon: DesignServicesIcon,
        title: "Design a template",
        body: "Compose in a visual editor with {{variable}} placeholders and a live preview.",
    },
    {
        icon: WebhookIcon,
        title: "Trigger via webhook",
        body: "POST an event with per-config credentials. We merge variables and send.",
    },
    {
        icon: InsightsIcon,
        title: "Track delivery",
        body: "Every send is logged with status, recipient, and resolved variables.",
    },
];

const FEATURES: { icon: SvgIconComponent; title: string; body: string }[] = [
    {
        icon: VpnKeyIcon,
        title: "Bring your own sender",
        body: "Connect any mailbox with an email and app password. Your sender, your domain, your reputation — encrypted at rest and never locked in.",
    },
    {
        icon: DesignServicesIcon,
        title: "Visual template editor",
        body: "Design emails in a WYSIWYG editor with {{variable}} placeholders and a live preview that renders exactly what recipients will see.",
    },
    {
        icon: WebhookIcon,
        title: "Trigger from your stack",
        body: "Fire a single webhook from your service with per-config client credentials. We resolve variables into your template and deliver.",
    },
    {
        icon: BoltIcon,
        title: "Event-based, not batch",
        body: "Welcome emails, receipts, password resets, alerts — every send is a single, idempotent, traceable event, not a campaign.",
    },
    {
        icon: CodeIcon,
        title: "No mail infra to build",
        body: "Skip SMTP plumbing, retries, queues, and template engines. One dashboard and one endpoint, and you are sending.",
    },
    {
        icon: MarkEmailReadIcon,
        title: "Delivery logs",
        body: "Each triggered send is recorded with status, recipient, and the variables it resolved — searchable from your dashboard.",
    },
];

const USE_CASES: { icon: SvgIconComponent; label: string }[] = [
    { icon: ReceiptLongIcon, label: "Receipts" },
    { icon: WavingHandIcon, label: "Welcome emails" },
    { icon: PasswordIcon, label: "Password resets" },
    { icon: LockIcon, label: "OTP & verification" },
    { icon: NotificationsActiveIcon, label: "Alerts" },
    { icon: MarkEmailReadIcon, label: "Confirmations" },
];

const TRUST: { icon: SvgIconComponent; label: string }[] = [
    { icon: HubIcon, label: "Single sign-on via Elixpo Accounts" },
    { icon: LockIcon, label: "Sender credentials encrypted at rest" },
    { icon: PublicIcon, label: "Delivered on Cloudflare's global edge" },
];

const WEBHOOK_EXAMPLE = `curl -X POST https://mail.elixpo.com/v1/send \\
  -H "Authorization: Bearer lix_mail_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "config": "welcome-email",
    "to": "ada@example.com",
    "variables": { "name": "Ada", "product": "Acme" }
  }'`;

export default function Home() {
    const authed = useAuthed();
    return (
        <PageShell variant="default">
            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <PixelHero authed={authed} />

            {/* ── How it works: Rule-separated lists instead of boxed cards ─────────────────── */}
            <Box sx={{ background: "#ffffff", py: { xs: 8, md: 12 }, borderTop: `1px solid ${HAIRLINE}` }}>
                <Container maxWidth="lg">
                    <SectionHead
                        eyebrow="How it works"
                        title="From event to inbox in four steps"
                        body="No SMTP servers to run, no template engine to wire up. Configure once, then trigger sends from anywhere in your stack."
                    />
                    
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={4}
                        sx={{ borderTop: `1px solid ${HAIRLINE}`, pt: 4 }}
                    >
                        {STEPS.map((s, i) => (
                            <Box
                                key={s.title}
                                sx={{
                                    flex: 1,
                                    pt: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                            >
                                <Typography 
                                    sx={{ 
                                        fontFamily: "var(--font-mono)", 
                                        fontSize: "0.82rem", 
                                        color: CORAL, 
                                        fontWeight: 500, 
                                        mb: 1.5 
                                    }}
                                >
                                    0{i + 1}
                                </Typography>
                                <Typography 
                                    sx={{ 
                                        fontFamily: "var(--font-display)", 
                                        fontWeight: 500, 
                                        fontSize: "1.25rem", 
                                        color: "#000000", 
                                        mb: 1,
                                        letterSpacing: "-0.01em" 
                                    }}
                                >
                                    {s.title}
                                </Typography>
                                <Typography sx={{ color: SLATE, fontSize: "0.9rem", lineHeight: 1.6 }}>
                                    {s.body}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                </Container>
            </Box>

            {/* ── Capabilities (Rule-aligned cards, no full borders) ──────────────────── */}
            <Box id="features" sx={{ background: "#ffffff", py: { xs: 8, md: 12 }, borderTop: `1px solid ${HAIRLINE}`, scrollMarginTop: "80px" }}>
                <Container maxWidth="lg">
                    <SectionHead
                        eyebrow="Capabilities"
                        title="Everything you need to send"
                        body="A multi-tenant transactional email layer — your sender, your templates, your triggers, on the edge."
                    />
                    
                    <Box
                        sx={{
                            display: "grid",
                            columnGap: 5,
                            rowGap: 7,
                            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
                        }}
                    >
                        {FEATURES.map((f) => (
                            <Box 
                                key={f.title} 
                                sx={{ 
                                    maxWidth: 360,
                                    borderTop: `1.5px solid ${HAIRLINE}`,
                                    pt: 2.5
                                }}
                            >
                                <Typography sx={{ fontWeight: 500, fontSize: "1.2rem", color: "#000000", mb: 1, fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}>
                                    {f.title}
                                </Typography>
                                <Typography sx={{ color: SLATE, fontSize: "0.92rem", lineHeight: 1.6, mb: 2 }}>
                                    {f.body}
                                </Typography>
                                <Button
                                    component={Link}
                                    href="/docs"
                                    sx={{
                                        color: ACTION_BLUE,
                                        fontSize: "0.85rem",
                                        fontWeight: 500,
                                        textTransform: "none",
                                        p: 0,
                                        minWidth: 0,
                                        background: "transparent",
                                        "&:hover": {
                                            background: "transparent",
                                            textDecoration: "underline"
                                        }
                                    }}
                                >
                                    Learn more →
                                </Button>
                            </Box>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* ── Use cases: Pill outline taxonomy controls ──────────────────────────────── */}
            <Box sx={{ background: "#ffffff", py: { xs: 7, md: 9 }, borderTop: `1px solid ${HAIRLINE}` }}>
                <Container maxWidth="md">
                    <Stack alignItems="center" textAlign="center" spacing={4}>
                        <Typography sx={{ color: SLATE, fontSize: "0.88rem", fontWeight: 500, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Built for every transactional moment
                        </Typography>
                        <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ flexWrap: "wrap", gap: 1.5 }}>
                            {USE_CASES.map((u) => (
                                <Stack
                                    key={u.label}
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    sx={{
                                        px: 2.2,
                                        py: 0.8,
                                        borderRadius: "30px", // Outlined pill radius
                                        border: "1px solid #d9d9dd",
                                        background: "transparent",
                                        transition: "all 0.2s ease",
                                        "&:hover": {
                                            borderColor: CORAL,
                                            background: "rgba(255,119,89,0.05)"
                                        }
                                    }}
                                >
                                    <u.icon sx={{ fontSize: 16, color: CORAL }} />
                                    <Typography sx={{ color: INK, fontSize: "0.85rem", fontWeight: 500, fontFamily: "var(--font-sans)" }}>
                                        {u.label}
                                    </Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </Stack>
                </Container>
            </Box>

            {/* ── Closing CTA: Soft Stone background panel ─────────────────────────────────── */}
            <Box sx={{ background: "#ffffff", py: { xs: 8, md: 10 }, borderTop: `1px solid ${HAIRLINE}` }}>
                <Container maxWidth="md">
                    <Box
                        sx={{
                            position: "relative",
                            textAlign: "center",
                            py: { xs: 8, md: 10 },
                            px: { xs: 3, md: 6 },
                            background: "#0c0d12", // Dark base fallback
                            border: `1px solid ${HAIRLINE}`,
                            borderRadius: "22px", // Signature 22px radius
                            overflow: "hidden",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                        }}
                    >
                        {/* Video Background */}
                        <Box
                            component="video"
                            autoPlay
                            loop
                            muted
                            playsInline
                            sx={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                zIndex: 0,
                                opacity: 0.85,
                            }}
                        >
                            <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_115655_b4d9cd77-feed-43cd-a198-af78ebdf1f7a.mp4" type="video/mp4" />
                        </Box>

                        {/* Readability Overlay */}
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                background: "linear-gradient(180deg, rgba(11, 13, 18, 0.45) 0%, rgba(11, 13, 18, 0.7) 100%)",
                                zIndex: 1,
                            }}
                        />

                        {/* Content Wrapper */}
                        <Box sx={{ position: "relative", zIndex: 2 }}>
                            <Typography 
                                sx={{ 
                                    fontFamily: "var(--font-display)",
                                    fontWeight: 500, 
                                    fontSize: { xs: "1.75rem", md: "2.5rem" }, 
                                    letterSpacing: "-0.03em", 
                                    mb: 2,
                                    color: "#ffffff"
                                }}
                            >
                                Ship your first email today
                            </Typography>
                            <Typography sx={{ color: "rgba(255, 255, 255, 0.75)", fontSize: "1rem", maxWidth: 480, mx: "auto", mb: 4.5, lineHeight: 1.6, fontFamily: "var(--font-sans)" }}>
                                Connect a sender, design a template, and trigger a send in minutes —
                                no SMTP servers, no template engines, no queues.
                            </Typography>
                            <PrimaryCta
                                authed={authed}
                                signedOutLabel="Sign in with Elixpo"
                                sx={{
                                    background: "#ffffff",
                                    color: "#0b0d12",
                                    "&:hover": {
                                        background: "rgba(255, 255, 255, 0.9)",
                                    }
                                }}
                            />
                        </Box>
                    </Box>
                </Container>
            </Box>
        </PageShell>
    );
}
