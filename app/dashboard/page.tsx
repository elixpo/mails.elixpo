export const runtime = "edge";

import DnsIcon from "@mui/icons-material/Dns";
import HistoryIcon from "@mui/icons-material/History";
import SettingsEthernetIcon from "@mui/icons-material/SettingsEthernet";
import ViewQuiltIcon from "@mui/icons-material/ViewQuilt";
import { Box, Button, Chip, Container, Stack, Typography } from "@mui/material";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import BackgroundAurora from "../components/background-aurora";
import { GlassCard } from "../components/glass-card";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

interface Section {
    icon: typeof DnsIcon;
    title: string;
    description: string;
    accent: string;
}

const SECTIONS: Section[] = [
    {
        icon: DnsIcon,
        title: "Senders",
        description:
            "Connect the mailboxes you send from — an email address and an app password. Bring your own sender; your domain, your reputation.",
        accent: "#9b7bf7",
    },
    {
        icon: ViewQuiltIcon,
        title: "Templates",
        description:
            "Design transactional emails in a WYSIWYG editor with {{variable}} placeholders and a live preview of the rendered result.",
        accent: "#86efac",
    },
    {
        icon: SettingsEthernetIcon,
        title: "Email configs",
        description:
            "Pair a sender with a template and mint per-config client credentials so your service can trigger sends via webhook.",
        accent: "#5fb6ff",
    },
    {
        icon: HistoryIcon,
        title: "Delivery logs",
        description:
            "Every triggered send recorded with its recipient, status, and the variables that were merged in — searchable here.",
        accent: "#fbbf24",
    },
];

export default async function DashboardPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    const session = await verifySession(token);
    if (!session) {
        redirect("/login");
    }

    const greeting = session.name || session.email;

    return (
        <Box sx={{ position: "relative", minHeight: "100vh", color: "#f5f5f4" }}>
            <BackgroundAurora variant="default" />
            <Box sx={{ position: "relative", zIndex: 1 }}>
                {/* Slim dashboard header */}
                <Box
                    sx={{
                        borderBottom: "1px solid rgba(255,255,255,0.07)",
                        background: "rgba(11,13,18,0.72)",
                        backdropFilter: "blur(20px)",
                    }}
                >
                    <Container
                        maxWidth="lg"
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            minHeight: 64,
                        }}
                    >
                        <Box
                            component={Link}
                            href="/"
                            sx={{ display: "flex", alignItems: "center", gap: 1.2, textDecoration: "none", color: "inherit" }}
                        >
                            <Box
                                component="img"
                                src="/mark.png"
                                alt="mail.elixpo"
                                sx={{ height: 30, width: 30, borderRadius: "8px", display: "block" }}
                            />
                            <Typography sx={{ fontWeight: 700, color: "#f5f5f4", letterSpacing: "-0.01em" }}>
                                mail
                                <Box component="span" sx={{ color: "#9b7bf7" }}>
                                    .elixpo
                                </Box>
                            </Typography>
                        </Box>
                        <Box sx={{ flexGrow: 1 }} />
                        <Button
                            component="a"
                            href="/api/auth/logout"
                            sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                fontSize: "0.85rem",
                                color: "rgba(244,244,246,0.7)",
                                px: 1.6,
                                py: 0.7,
                                borderRadius: "10px",
                                border: "1px solid rgba(255,255,255,0.1)",
                                "&:hover": { color: "#fff", borderColor: "rgba(239,68,68,0.45)", background: "rgba(239,68,68,0.08)" },
                            }}
                        >
                            Sign out
                        </Button>
                    </Container>
                </Box>

                <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
                    {/* Greeting */}
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        spacing={2}
                        sx={{ mb: 4 }}
                    >
                        <Box>
                            <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.7rem", md: "2.1rem" }, letterSpacing: "-0.02em" }}>
                                Welcome, {greeting}
                            </Typography>
                            <Typography sx={{ color: "rgba(245,245,244,0.55)", fontSize: "0.95rem", mt: 0.4 }}>
                                Your transactional email workspace. Connect a sender, design a
                                template, and start triggering sends.
                            </Typography>
                        </Box>
                        <Stack spacing={0.6} alignItems={{ xs: "flex-start", sm: "flex-end" }}>
                            <Typography sx={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(245,245,244,0.4)", fontWeight: 700 }}>
                                Tenant
                            </Typography>
                            <Chip
                                label={session.tenantId}
                                sx={{
                                    fontFamily: "var(--font-geist-mono)",
                                    fontSize: "0.78rem",
                                    bgcolor: "rgba(155,123,247,0.12)",
                                    color: "#c4b5fd",
                                    border: "1px solid rgba(155,123,247,0.3)",
                                }}
                            />
                        </Stack>
                    </Stack>

                    {/* Empty-state section cards */}
                    <Box
                        sx={{
                            display: "grid",
                            gap: 2.5,
                            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                        }}
                    >
                        {SECTIONS.map((s) => (
                            <GlassCard key={s.title} sx={{ height: "100%" }}>
                                <Stack direction="row" spacing={1.6} alignItems="flex-start">
                                    <Box
                                        sx={{
                                            width: 46,
                                            height: 46,
                                            borderRadius: "13px",
                                            display: "grid",
                                            placeItems: "center",
                                            flexShrink: 0,
                                            color: s.accent,
                                            background: `${s.accent}14`,
                                            border: `1px solid ${s.accent}40`,
                                        }}
                                    >
                                        <s.icon sx={{ fontSize: 23 }} />
                                    </Box>
                                    <Box>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.6 }}>
                                            <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", color: "#f5f5f4" }}>
                                                {s.title}
                                            </Typography>
                                            <Chip
                                                label="Coming soon"
                                                size="small"
                                                sx={{
                                                    height: 20,
                                                    fontSize: "0.62rem",
                                                    fontWeight: 700,
                                                    letterSpacing: "0.04em",
                                                    color: "rgba(245,245,244,0.5)",
                                                    bgcolor: "rgba(255,255,255,0.05)",
                                                    border: "1px solid rgba(255,255,255,0.1)",
                                                }}
                                            />
                                        </Stack>
                                        <Typography sx={{ color: "rgba(245,245,244,0.6)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                                            {s.description}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </GlassCard>
                        ))}
                    </Box>
                </Container>
            </Box>
        </Box>
    );
}
