import { createTheme } from "@mui/material/styles";

export const tokens = {
  bg: "#0a0b0e",
  cardGradient: "linear-gradient(158deg,#17191e,#0f1114)",
  profileGradient: "linear-gradient(158deg,#181a20,#0f1114)",
  aiGradient: "linear-gradient(158deg,#1a1c22,#0f1114)",
  cardBorder: "1px solid rgba(255,255,255,0.06)",
  cardShadow:
    "0 1px 0 rgba(255,255,255,0.05) inset, 0 24px 48px -28px rgba(0,0,0,0.7)",
  green: "oklch(0.74 0.14 150)",
  greenBright: "oklch(0.82 0.13 150)",
  greenPillBg: "oklch(0.72 0.14 150 / 0.12)",
  amber: "oklch(0.79 0.14 80)",
  red: "oklch(0.66 0.16 25)",
  redText: "oklch(0.7 0.16 25)",
  violet: "oklch(0.72 0.15 285)",
  orange: "oklch(0.78 0.13 55)",
  blue: "oklch(0.7 0.13 245)",
  track: "rgba(255,255,255,0.06)",
  mono: "'JetBrains Mono', monospace",
  sans: "'Space Grotesk', system-ui, sans-serif",
  heatColors: [
    "rgba(255,255,255,0.045)",
    "oklch(0.42 0.08 150)",
    "oklch(0.55 0.12 150)",
    "oklch(0.68 0.15 150)",
    "oklch(0.82 0.17 150)",
  ],
};

export const theme = createTheme({
  palette: {
    mode: "dark",
    background: { default: tokens.bg, paper: "#121317" },
    primary: { main: "#83dc97", contrastText: "#0a0b0e" },
    text: { primary: "#fff", secondary: "rgba(255,255,255,0.45)" },
  },
  typography: {
    fontFamily: tokens.sans,
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
});
