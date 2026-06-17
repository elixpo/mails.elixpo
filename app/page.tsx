"use client";

import type { SvgIconComponent } from "@mui/icons-material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BoltIcon from "@mui/icons-material/Bolt";
import CodeIcon from "@mui/icons-material/Code";
import DesignServicesIcon from "@mui/icons-material/DesignServices";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import OutboundIcon from "@mui/icons-material/Outbound";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import WebhookIcon from "@mui/icons-material/Webhook";
import { Box, Button, Chip, Container, Stack, Typography } from "@mui/material";
import Link from "next/link";
import CodeBlock from "./components/code-block";
import { GlassCard } from "./components/glass-card";
import PageShell from "./components/page-shell";

interface Feature {
    icon: SvgIconComponent;
    title: string;
    body: string;
    accent: string;
}

const FEATURES: Feature[] = [
    {
        icon: VpnKeyIcon,
        title: "Bring your own sender",
        body: "Connect any mailbox with an email + app password. Your sender, your reputation, your domain — we never lock you in.",
        accent: "#9b7bf7",
    },
    {
        icon: DesignServicesIcon,
        title: "Design templates visually",
        body: "Compose emails in a WYSIWYG editor with {{variable}} placeholders and a live preview that renders exactly what your recipients see.",
        accent: "#86efac",
    },
    {
        icon: WebhookIcon,
        title: "Trigger via webhook",
        body: "Fire an event from your service with per-config client credentials. We merge variables into your template and deliver.",
        accent: "#5fb6ff",
    },
    {
        icon: BoltIcon,
        title: "Event-based, not batch",
        body: "Welcome emails, receipts, password resets, alerts — every send is a single, idempotent, traceable event.",
        accent: "#fbbf24",
    },
    {
        icon: CodeIcon,
        title: "No mail infra to build",
        body: "Skip SMTP plumbing, retries, and template engines. One dashboard, one webhook, and you're sending.",
        accent: "#c4b5fd",
    },
    {
        icon: MarkEmailReadIcon,
        title: "Delivery logs",
        body: "Every triggered send is recorded with its status, recipient, and resolved variables — searchable from your dashboard.",
        accent: "#ff7cc9",
    },
];

const WEBHOOK_EXAMPLE = `curl -X POST https://mail.elixpo.com/v1/send \\
  -H "Authorization: Bearer mc_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "config": "welcome-email",
    "to": "ada@example.com",
    "variables": {
      "name": "Ada",
      "product": "Acme"
    }
  }'`;

export default function Home() {
    return (
        <PageShell variant="default">
            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <Container maxWidth="lg" sx={{ position: "relative", pt: { xs: 8, md: 14 }, pb: { xs: 6, md: 10 } }}>
                <Stack alignItems="center" textAlign="center" spacing={3}>
                    <Chip
                        label="Event-based transactional email"
                        sx={{
                            bgcolor: "rgba(155,123,247,0.12)",
                            color: "#c4b5fd",
                            fontWeight: 600,
                            letterSpacing: "0.04em",
                            border: "1px solid rgba(155,123,247,0.3)",
                        }}
                    />
                    <Typography
                        component="h1"
                        sx={{
                            fontWeight: 800,
                            fontSize: { xs: "2.4rem", md: "3.8rem" },
                            letterSpacing: "-0.025em",
                            lineHeight: 1.05,
                            color: "#f5f5f4",
                            maxWidth: 880,
                        }}
                    >
                        Send transactional email{" "}
                        <Box component="span" sx={{ color: "#9b7bf7" }}>
                            without building mail infra.
                        </Box>
                    </Typography>
                    <Typography
                        sx={{
                            maxWidth: 660,
                            color: "rgba(245,245,244,0.65)",
                            fontSize: { xs: "1rem", md: "1.2rem" },
                            lineHeight: 1.7,
                        }}
                    >
                        Bring your own sender, design email templates with{" "}
                        <Box component="span" sx={{ fontFamily: "var(--font-geist-mono)", color: "#86efac" }}>
                            {"{{variables}}"}
                        </Box>{" "}
                        in a live WYSIWYG editor, and trigger sends from your service via
                        a webhook — one config, one event, delivered.
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.6} sx={{ pt: 1 }}>
                        <Button
                            component="a"
                            href="/api/auth/login"
                            endIcon={<ArrowForwardIcon sx={{ fontSize: "1.1rem !important" }} />}
                            sx={{
                                textTransform: "none",
                                fontWeight: 700,
                                fontSize: "1rem",
                                color: "#fff",
                                px: 3.2,
                                py: 1.4,
                                borderRadius: "12px",
                                background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                                boxShadow: "0 8px 24px rgba(124,92,255,0.4)",
                                "&:hover": { background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)" },
                            }}
                        >
                            Get started — Sign in with Elixpo
                        </Button>
                        <Button
                            component={Link}
                            href="/docs"
                            sx={{
                                textTransform: "none",
                                fontWeight: 700,
                                fontSize: "1rem",
                                color: "#f5f5f4",
                                px: 3.2,
                                py: 1.4,
                                borderRadius: "12px",
                                border: "1px solid rgba(255,255,255,0.16)",
                                "&:hover": { borderColor: "rgba(155,123,247,0.5)", background: "rgba(155,123,247,0.06)" },
                            }}
                        >
                            Read the docs
                        </Button>
                    </Stack>
                </Stack>

                {/* Webhook artifact */}
                <Box sx={{ maxWidth: 720, mx: "auto", mt: { xs: 6, md: 9 } }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, color: "rgba(245,245,244,0.55)" }}>
                        <OutboundIcon sx={{ fontSize: 18, color: "#9b7bf7" }} />
                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.02em" }}>
                            Trigger a send from anywhere
                        </Typography>
                    </Stack>
                    <CodeBlock code={WEBHOOK_EXAMPLE} language="bash" />
                </Box>
            </Container>

            {/* ── Features ─────────────────────────────────────────────────── */}
            <Box id="features" sx={{ position: "relative", py: { xs: 6, md: 10 }, scrollMarginTop: "80px" }}>
                <Container maxWidth="lg">
                    <Stack alignItems="center" textAlign="center" spacing={1.5} sx={{ mb: { xs: 4, md: 6 } }}>
                        <Typography
                            component="h2"
                            sx={{
                                fontWeight: 800,
                                fontSize: { xs: "2rem", md: "2.8rem" },
                                letterSpacing: "-0.02em",
                                lineHeight: 1.05,
                                color: "#f5f5f4",
                            }}
                        >
                            Everything you need to send
                        </Typography>
                        <Typography sx={{ maxWidth: 580, color: "rgba(245,245,244,0.65)", fontSize: "1.05rem", lineHeight: 1.7 }}>
                            A multi-tenant transactional email layer — your sender, your
                            templates, your triggers, on the edge.
                        </Typography>
                    </Stack>

                    <Box
                        sx={{
                            display: "grid",
                            gap: 2.5,
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "repeat(2, 1fr)",
                                md: "repeat(3, 1fr)",
                            },
                        }}
                    >
                        {FEATURES.map((f) => (
                            <GlassCard key={f.title} sx={{ height: "100%" }}>
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: "14px",
                                        display: "grid",
                                        placeItems: "center",
                                        mb: 1.8,
                                        color: f.accent,
                                        background: `${f.accent}14`,
                                        border: `1px solid ${f.accent}40`,
                                    }}
                                >
                                    <f.icon sx={{ fontSize: 24 }} />
                                </Box>
                                <Typography sx={{ fontWeight: 700, fontSize: "1.08rem", color: "#f5f5f4", mb: 0.8 }}>
                                    {f.title}
                                </Typography>
                                <Typography sx={{ color: "rgba(245,245,244,0.6)", fontSize: "0.9rem", lineHeight: 1.65 }}>
                                    {f.body}
                                </Typography>
                            </GlassCard>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* ── Closing CTA ──────────────────────────────────────────────── */}
            <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
                <GlassCard
                    sx={{
                        textAlign: "center",
                        py: { xs: 5, md: 7 },
                        background: "linear-gradient(160deg, rgba(155,123,247,0.12) 0%, rgba(124,92,255,0.05) 100%)",
                        border: "1px solid rgba(155,123,247,0.25)",
                    }}
                >
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.6rem", md: "2.2rem" }, letterSpacing: "-0.02em", mb: 1.2 }}>
                        Ship your first email today
                    </Typography>
                    <Typography sx={{ color: "rgba(245,245,244,0.65)", fontSize: "1rem", maxWidth: 480, mx: "auto", mb: 3 }}>
                        Connect a sender, design a template, and trigger a send in minutes
                        — no SMTP servers, no template engines, no queues.
                    </Typography>
                    <Button
                        component="a"
                        href="/api/auth/login"
                        endIcon={<ArrowForwardIcon sx={{ fontSize: "1.1rem !important" }} />}
                        sx={{
                            textTransform: "none",
                            fontWeight: 700,
                            fontSize: "1rem",
                            color: "#fff",
                            px: 3.2,
                            py: 1.4,
                            borderRadius: "12px",
                            background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                            boxShadow: "0 8px 24px rgba(124,92,255,0.4)",
                            "&:hover": { background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)" },
                        }}
                    >
                        Sign in with Elixpo
                    </Button>
                </GlassCard>
            </Container>
        </PageShell>
    );
}
