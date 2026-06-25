"use client";

import CloseIcon from "@mui/icons-material/Close";
import GitHubIcon from "@mui/icons-material/GitHub";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import MenuIcon from "@mui/icons-material/Menu";
import StarIcon from "@mui/icons-material/Star";
import { Avatar, Box, Button, Chip, Drawer, IconButton, Stack, Toolbar, Typography } from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardNavLinks } from "./dashboard-nav";

interface Me {
    name: string;
    email: string;
    avatar: string | null;
}

const ACCENT = "#ff7759";
const REPO = "elixpo/mail.elixpo";
const REPO_URL = `https://github.com/${REPO}`;

const LINKS = [
    { label: "Home", href: "/" },
    { label: "Pricing", href: "/pricing" },
    { label: "Docs", href: "/docs" },
    { label: "Dashboard", href: "/dashboard" },
];

function formatStars(n: number): string {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const Navbar = () => {
    const [stars, setStars] = useState<number | null>(null);
    // undefined = checking, null = signed out, Me = signed in
    const [me, setMe] = useState<Me | null | undefined>(undefined);
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/auth/me", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: any) => {
                if (cancelled) return;
                if (d && d.authenticated && d.user) {
                    setMe({ name: d.user.name, email: d.user.email, avatar: d.user.avatar });
                } else {
                    setMe(null);
                }
            })
            .catch(() => {
                if (!cancelled) setMe(null);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetch(`https://api.github.com/repos/${REPO}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d: any) => {
                if (!cancelled && d && typeof d.stargazers_count === "number") {
                    setStars(d.stargazers_count);
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    const pathname = usePathname() || "";
    const isDashboard = pathname.startsWith("/dashboard");

    // Cohere-style variables based on route context
    const navBg = isDashboard ? "rgba(11, 13, 18, 0.72)" : "rgba(255, 255, 255, 0.85)";
    const navBorder = isDashboard ? "1px solid rgba(255,255,255,0.07)" : "1px solid var(--border-light)";
    const textColor = isDashboard ? "#f4f4f6" : "#000000";
    const brandColor = isDashboard ? "#f4f4f6" : "#000000";
    const linkColor = isDashboard ? "rgba(244,244,246,0.7)" : "rgba(33, 33, 33, 0.65)";
    const linkHoverBg = isDashboard ? "rgba(255,255,255,0.05)" : "rgba(0, 0, 0, 0.04)";
    const linkHoverColor = isDashboard ? "#fff" : "#000000";
    const githubBorder = isDashboard ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";
    const githubTextColor = isDashboard ? "rgba(244,244,246,0.8)" : "#212121";
    const githubHoverBg = isDashboard ? "rgba(155,123,247,0.08)" : "rgba(0, 0, 0, 0.03)";
    const githubHoverBorder = isDashboard ? "rgba(155,123,247,0.45)" : "#000000";
    
    // Primary CTA (Sign In) style: Cohere Black pill for public, purple gradient/accent for dashboard/custom
    const ctaStyles = isDashboard
        ? {
              background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
              borderRadius: "10px",
              boxShadow: "0 4px 14px rgba(155,123,247,0.32)",
              "&:hover": {
                  background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)",
                  boxShadow: "0 6px 20px rgba(155,123,247,0.45)",
              },
          }
        : {
              background: "#17171c",
              color: "#ffffff",
              borderRadius: "32px", // Pill!
              px: 2.5,
              py: 0.9,
              fontSize: "0.88rem",
              fontWeight: 500,
              fontFamily: "var(--font-sans)",
              textTransform: "none",
              transition: "background 0.2s ease",
              "&:hover": {
                  background: "#000000",
              },
          };

    return (
        <AppBar
            position="sticky"
            elevation={0}
            sx={{
                background: navBg,
                backdropFilter: "blur(20px)",
                borderBottom: navBorder,
                zIndex: 1000,
                color: textColor,
            }}
        >
            <Toolbar
                sx={{
                    maxWidth: "1240px",
                    width: "100%",
                    mx: "auto",
                    px: { xs: 2, md: 4 },
                    minHeight: { xs: 60, md: 68 },
                    gap: 1,
                }}
            >
                <Link
                    href="/"
                    style={{
                        textDecoration: "none",
                        color: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                    }}
                >
                    <Box
                        component="img"
                        src="/mark.png"
                        alt="mail.elixpo"
                        sx={{ height: 32, width: 32, borderRadius: "8px", display: "block" }}
                    />
                    <Typography
                        sx={{
                            fontWeight: 700,
                            fontSize: "1.15rem",
                            color: brandColor,
                            letterSpacing: "-0.01em",
                            fontFamily: "var(--font-display)",
                        }}
                    >
                        Elixpo
                        <Box component="span" sx={{ color: isDashboard ? ACCENT : "#ff7759" }}>
                            {" "}
                            Mails
                        </Box>
                    </Typography>
                    {!me && (
                        <Chip
                            label="EMAIL"
                            size="small"
                            sx={{
                                display: { xs: "none", sm: "inline-flex" },
                                bgcolor: isDashboard ? "rgba(155, 123, 247, 0.12)" : "rgba(255, 119, 89, 0.08)",
                                color: isDashboard ? ACCENT : "#ff7759",
                                fontSize: "10px",
                                height: "22px",
                                fontWeight: 600,
                                letterSpacing: "0.04em",
                                border: isDashboard ? "1px solid rgba(155, 123, 247, 0.3)" : "1px solid rgba(255, 119, 89, 0.3)",
                            }}
                        />
                    )}
                </Link>

                <Box sx={{ flexGrow: 1, justifyContent: "center", display: { xs: "none", md: "flex" } }}>
                    {me === undefined ? null : me ? (
                        // Signed in: show the app routes (same as the dashboard nav).
                        <DashboardNavLinks orientation="horizontal" />
                    ) : (
                        <Stack direction="row" spacing={0.5}>
                            {LINKS.map((l) => (
                                <Button
                                    key={l.label}
                                    component={Link}
                                    href={l.href}
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 500,
                                        fontSize: "0.88rem",
                                        color: linkColor,
                                        px: 1.6,
                                        borderRadius: "9px",
                                        fontFamily: "var(--font-sans)",
                                        "&:hover": { color: linkHoverColor, background: linkHoverBg },
                                    }}
                                >
                                    {l.label}
                                </Button>
                            ))}
                        </Stack>
                    )}
                </Box>

                <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />

                <Stack direction="row" spacing={{ xs: 1, md: 1.2 }} alignItems="center">
                    {/* GitHub (marketing nav only — hidden once signed in) */}
                    {!me && (
                    <Box
                        component="a"
                        href={REPO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="GitHub repository"
                        sx={{
                            display: { xs: "none", sm: "inline-flex" },
                            alignItems: "center",
                            height: 38,
                            px: 1.3,
                            gap: 0.9,
                            borderRadius: isDashboard ? "10px" : "32px",
                            border: `1px solid ${githubBorder}`,
                            color: githubTextColor,
                            textDecoration: "none",
                            fontSize: "0.85rem",
                            fontWeight: 500,
                            fontFamily: "var(--font-sans)",
                            transition: "all 0.18s ease",
                            "&:hover": {
                                color: isDashboard ? "#fff" : "#000000",
                                borderColor: githubHoverBorder,
                                background: githubHoverBg,
                            },
                        }}
                    >
                        <GitHubIcon sx={{ fontSize: 19 }} />
                        {stars !== null && (
                            <>
                                <Box sx={{ width: "1px", height: 16, background: isDashboard ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" }} />
                                <Stack direction="row" spacing={0.3} alignItems="center">
                                    <StarIcon sx={{ fontSize: 14, color: "#fbbf24" }} />
                                    <Box component="span">{formatStars(stars)}</Box>
                                </Stack>
                            </>
                        )}
                    </Box>
                    )}

                    {me === undefined ? (
                        // Placeholder while we resolve the session — avoids flashing
                        // "Sign in" to an already-signed-in user.
                        <Box sx={{ width: 104, height: 38 }} />
                    ) : me ? (
                        // Signed in: dashboard-style profile chip → /dashboard (no sign out here).
                        <Box
                            component={Link}
                            href="/dashboard"
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                textDecoration: "none",
                                color: "inherit",
                                border: isDashboard ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.12)",
                                borderRadius: isDashboard ? "10px" : "32px",
                                pl: 0.6,
                                pr: { xs: 0.6, sm: 1 },
                                py: 0.5,
                                transition: "all 0.15s ease",
                                "&:hover": { borderColor: isDashboard ? "rgba(155,123,247,0.4)" : "#000000", background: isDashboard ? "rgba(155,123,247,0.06)" : "rgba(0,0,0,0.02)" },
                            }}
                        >
                            <Avatar
                                src={me.avatar || undefined}
                                sx={{ width: 28, height: 28, fontSize: "0.85rem", bgcolor: isDashboard ? "rgba(155,123,247,0.4)" : "#17171c" }}
                            >
                                {(me.name || me.email || "?").charAt(0).toUpperCase()}
                            </Avatar>
                            <Stack sx={{ display: { xs: "none", sm: "flex" }, alignItems: "flex-start", lineHeight: 1.1 }}>
                                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: textColor, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {me.name || me.email}
                                </Typography>
                                <Typography sx={{ fontSize: "0.7rem", color: isDashboard ? "rgba(245,245,244,0.45)" : "rgba(33,33,33,0.55)", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {me.email}
                                </Typography>
                            </Stack>
                            <KeyboardArrowDownIcon sx={{ fontSize: 18, color: isDashboard ? "rgba(245,245,244,0.5)" : "rgba(33,33,33,0.4)", display: { xs: "none", sm: "block" } }} />
                        </Box>
                    ) : (
                        <Button
                            component="a"
                            href="/api/auth/login"
                            disableElevation
                            sx={{
                                textTransform: "none",
                                fontWeight: 500,
                                fontSize: "0.9rem",
                                ...ctaStyles,
                            }}
                        >
                            Sign in
                        </Button>
                    )}

                    {/* Mobile hamburger */}
                    <IconButton
                        onClick={() => setDrawerOpen(true)}
                        aria-label="Open menu"
                        sx={{ display: { xs: "inline-flex", md: "none" }, color: isDashboard ? "rgba(244,244,246,0.85)" : "#212121" }}
                    >
                        <MenuIcon />
                    </IconButton>
                </Stack>
            </Toolbar>

            {/* Mobile nav drawer */}
            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                sx={{ display: { md: "none" } }}
                PaperProps={{
                    sx: {
                        width: 282,
                        background: isDashboard ? "#0d1016" : "#ffffff",
                        borderLeft: isDashboard ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e5e7eb",
                        color: isDashboard ? "#f5f5f4" : "#212121",
                        p: 2,
                    },
                }}
            >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, px: 0.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1.1}>
                        <Box component="img" src="/mark.png" alt="Elixpo Mails" sx={{ height: 26, width: 26, borderRadius: "7px" }} />
                        <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: isDashboard ? "#fff" : "#000" }}>
                            Elixpo
                            <Box component="span" sx={{ color: isDashboard ? ACCENT : "#ff7759" }}>
                                {" "}
                                Mails
                            </Box>
                        </Typography>
                    </Stack>
                    <IconButton onClick={() => setDrawerOpen(false)} aria-label="Close menu" sx={{ color: isDashboard ? "rgba(245,245,244,0.6)" : "rgba(0,0,0,0.5)" }}>
                        <CloseIcon />
                    </IconButton>
                </Stack>

                {me ? (
                    // Signed in: the app routes (no sign out here — that lives in the dashboard).
                    <DashboardNavLinks orientation="vertical" onNavigate={() => setDrawerOpen(false)} />
                ) : (
                    <Stack spacing={0.5}>
                        {LINKS.map((l) => (
                            <Button
                                key={l.label}
                                component={Link}
                                href={l.href}
                                onClick={() => setDrawerOpen(false)}
                                sx={{
                                    justifyContent: "flex-start",
                                    textTransform: "none",
                                    fontWeight: 500,
                                    fontSize: "0.95rem",
                                    color: linkColor,
                                    px: 1.5,
                                    py: 1.1,
                                    borderRadius: "10px",
                                    "&:hover": { color: linkHoverColor, background: linkHoverBg },
                                }}
                            >
                                {l.label}
                            </Button>
                        ))}
                        <Button
                            component="a"
                            href="/api/auth/login"
                            onClick={() => setDrawerOpen(false)}
                            sx={{
                                mt: 1,
                                textTransform: "none",
                                fontWeight: 500,
                                fontSize: "0.95rem",
                                ...ctaStyles,
                            }}
                        >
                            Sign in
                        </Button>
                    </Stack>
                )}
            </Drawer>
        </AppBar>
    );
};

export default Navbar;
