"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import { Box, Button, Snackbar, Stack, Tooltip, Typography } from "@mui/material";
import Link from "next/link";
import { useState } from "react";

const ACCENT = "#9b7bf7";
const EMAIL = "hello@elixpo.com";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
    {
        heading: "Product",
        links: [
            { label: "Pricing", href: "/pricing" },
            { label: "Sign in", href: "/login" },
            { label: "Dashboard", href: "/dashboard" },
            { label: "Docs", href: "/docs" },
        ],
    },
    {
        heading: "Company",
        links: [
            { label: "Elixpo", href: "https://elixpo.com" },
            { label: "GitHub", href: "https://github.com/elixpo/mail.elixpo" },
            { label: "Contact", href: "mailto:hello@elixpo.com" },
        ],
    },
    {
        heading: "Legal",
        links: [
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
            { label: "Content Policy", href: "/content-policy" },
        ],
    },
];

const Footer = () => {
    const [copied, setCopied] = useState(false);
    const [emailVal, setEmailVal] = useState("");

    const copyEmail = async () => {
        try {
            await navigator.clipboard.writeText(EMAIL);
            setCopied(true);
        } catch {
            window.location.href = `mailto:${EMAIL}`;
        }
    };

    return (
        <Box
            component="footer"
            sx={{
                position: "relative",
                zIndex: 1,
                mt: { xs: 8, md: 12 },
                borderTop: "1px solid #292933",
                background: "#17171c", // Near-Black Primary
                color: "#ffffff",
                pt: { xs: 7, md: 9 },
                pb: { xs: 5, md: 6 },
            }}
        >
            <Box sx={{ maxWidth: "1200px", mx: "auto", px: { xs: 2.5, md: 4 } }}>
                <Stack
                    direction={{ xs: "column", lg: "row" }}
                    spacing={{ xs: 6, lg: 8 }}
                    justifyContent="space-between"
                    sx={{ mb: { xs: 6, md: 8 } }}
                >
                    {/* Newsletter Block on Left */}
                    <Box sx={{ maxWidth: 440, width: "100%" }}>
                        <Typography
                            sx={{
                                color: "#ff7759", // Coral accent
                                fontSize: "12px",
                                fontWeight: 500,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                mb: 1,
                                fontFamily: "var(--font-mono)",
                            }}
                        >
                            AI moves fast
                        </Typography>
                        <Typography
                            variant="h4"
                            sx={{
                                color: "#ffffff",
                                fontWeight: 400,
                                fontSize: "1.75rem",
                                letterSpacing: "-0.02em",
                                lineHeight: 1.2,
                                mb: 2,
                                fontFamily: "var(--font-display)",
                            }}
                        >
                            Stay updated on modern transactional email tech.
                        </Typography>
                        
                        {/* Single-line Email Input */}
                        <Stack 
                            direction="row" 
                            spacing={1} 
                            sx={{ 
                                position: "relative",
                                maxWidth: 360,
                                borderBottom: "1.5px solid #292933",
                                pb: 0.5,
                                "&:focus-within": {
                                    borderBottomColor: "#9b60aa", // Form Focus Violet
                                }
                            }}
                        >
                            <Box
                                component="input"
                                type="email"
                                placeholder="Subscribe to updates"
                                value={emailVal}
                                onChange={(e: any) => setEmailVal(e.target.value)}
                                sx={{
                                    width: "100%",
                                    background: "transparent",
                                    border: "none",
                                    color: "#ffffff",
                                    fontSize: "0.95rem",
                                    outline: "none",
                                    py: 1,
                                    "&::placeholder": {
                                        color: "rgba(255,255,255,0.3)"
                                    }
                                }}
                            />
                            <Button
                                onClick={() => {
                                    if (emailVal) {
                                        alert("Thank you for subscribing!");
                                        setEmailVal("");
                                    }
                                }}
                                sx={{
                                    minWidth: 0,
                                    p: 1,
                                    color: "#ffffff",
                                    "&:hover": {
                                        color: "#ff7759"
                                    }
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </Button>
                        </Stack>
                        <Typography sx={{ color: "#93939f", fontSize: "11px", mt: 1.5, lineHeight: 1.4 }}>
                            By subscribing, you agree to our privacy policy. Transactional mail infrastructure without the complexity.
                        </Typography>
                    </Box>

                    {/* Columns on Right */}
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 4, sm: 6, md: 8 }}>
                        {COLUMNS.map((col) => (
                            <Box key={col.heading} sx={{ minWidth: 100 }}>
                                <Typography
                                    sx={{
                                        color: "#ffffff", // White section labels
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        letterSpacing: "0.08em",
                                        textTransform: "uppercase",
                                        mb: 2,
                                        fontFamily: "var(--font-mono)",
                                    }}
                                >
                                    {col.heading}
                                </Typography>
                                <Stack spacing={1.2}>
                                    {col.links.map((l) => (
                                        <Link
                                            key={l.label}
                                            href={l.href}
                                            style={{
                                                color: "#93939f", // Muted slate links
                                                textDecoration: "none",
                                                fontSize: "0.88rem",
                                                fontFamily: "var(--font-sans)",
                                                transition: "color 0.2s ease",
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.color = "#93939f"; }}
                                        >
                                            {l.label}
                                        </Link>
                                    ))}
                                </Stack>
                            </Box>
                        ))}

                        <Box>
                            <Typography
                                sx={{
                                    color: "#ffffff",
                                    fontSize: "12px",
                                    fontWeight: 500,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                    mb: 2,
                                    fontFamily: "var(--font-mono)",
                                }}
                            >
                                Contact
                            </Typography>
                            <Tooltip title={copied ? "Copied!" : "Click to copy"} arrow>
                                <Button
                                    onClick={copyEmail}
                                    sx={{
                                        textTransform: "none",
                                        color: "#93939f",
                                        fontFamily: "var(--font-mono)",
                                        fontSize: "0.85rem",
                                        border: "1px solid #292933",
                                        borderRadius: "32px", // Pill outline
                                        px: 2,
                                        py: 0.7,
                                        transition: "all 0.2s ease",
                                        "&:hover": {
                                            color: "#ffffff",
                                            borderColor: "#ff7759",
                                            background: "rgba(255, 119, 89, 0.05)",
                                        },
                                    }}
                                >
                                    {EMAIL}
                                </Button>
                            </Tooltip>
                        </Box>
                    </Stack>
                </Stack>

                <Box
                    sx={{
                        pt: 3,
                        borderTop: "1px solid #292933",
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        justifyContent: "space-between",
                        alignItems: { xs: "flex-start", sm: "center" },
                        gap: 1.5,
                        color: "#93939f", // Muted slate
                        fontSize: "0.8rem",
                    }}
                >
                    <Typography sx={{ fontSize: "inherit" }}>
                        © {new Date().getFullYear()} Elixpo · Built on Cloudflare's edge
                    </Typography>
                    <Typography sx={{ fontSize: "inherit" }}>
                        Transactional email infrastructure for the Elixpo ecosystem
                    </Typography>
                </Box>
            </Box>

            <Snackbar
                open={copied}
                autoHideDuration={2000}
                onClose={() => setCopied(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                message={`Copied ${EMAIL}`}
            />
        </Box>
    );
};

export default Footer;
