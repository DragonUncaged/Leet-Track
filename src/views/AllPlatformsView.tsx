import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";
import InputBase from "@mui/material/InputBase";
import CircularProgress from "@mui/material/CircularProgress";
import Card from "../components/Card";
import { tokens } from "../theme";
import type {
  Stats,
  PlatformStats,
  UpcomingContest,
  CalendarDay,
  Tab,
} from "../types";

const fmt = (n: number) => n.toLocaleString("en-US");

export const PLATFORM_META = {
  leetcode: {
    label: "LeetCode",
    short: "LC",
    color: "oklch(0.78 0.14 60)",
    pill: { color: "oklch(0.82 0.14 60)", bg: "oklch(0.78 0.14 60 / 0.14)" },
    icon: "linear-gradient(150deg,oklch(0.78 0.14 60),oklch(0.6 0.13 45))",
    glow: "oklch(0.75 0.15 55 / 0.14)",
  },
  codeforces: {
    label: "Codeforces",
    short: "CF",
    color: "oklch(0.68 0.16 25)",
    pill: { color: "oklch(0.74 0.16 25)", bg: "oklch(0.68 0.16 25 / 0.14)" },
    icon: "linear-gradient(150deg,oklch(0.66 0.16 25),oklch(0.55 0.15 15))",
    glow: "oklch(0.66 0.15 25 / 0.14)",
  },
  codechef: {
    label: "CodeChef",
    short: "CC",
    color: "oklch(0.7 0.14 285)",
    pill: { color: "oklch(0.74 0.14 285)", bg: "oklch(0.7 0.14 285 / 0.14)" },
    icon: "linear-gradient(150deg,oklch(0.7 0.14 285),oklch(0.56 0.14 290))",
    glow: "oklch(0.66 0.15 285 / 0.14)",
  },
} as const;

type PlatformKey = keyof typeof PLATFORM_META;

function mergedStreak(calendars: CalendarDay[][]) {
  const perDay = new Map<string, number>();
  for (const cal of calendars) {
    for (const d of cal)
      perDay.set(d.date, (perDay.get(d.date) ?? 0) + d.count);
  }
  const active = new Set(
    [...perDay.entries()].filter(([, c]) => c > 0).map(([d]) => d),
  );
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  let current = 0;
  const back = new Date();
  if (!active.has(iso(back))) back.setDate(back.getDate() - 1);
  while (active.has(iso(back))) {
    current++;
    back.setDate(back.getDate() - 1);
  }
  return current;
}

function SummaryTile({
  label,
  value,
  sub,
  subColor,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  subColor?: string;
}) {
  return (
    <Box
      sx={{
        background: tokens.profileGradient,
        border: tokens.cardBorder,
        borderRadius: "20px",
        p: "22px",
        boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: tokens.mono,
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: "-1px",
          lineHeight: 1,
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{ fontSize: 12, color: subColor ?? "rgba(255,255,255,0.4)" }}
      >
        {sub}
      </Typography>
    </Box>
  );
}

function PlatformHeader({
  platform,
  handle,
  onDisconnect,
}: {
  platform: PlatformKey;
  handle: string | null;
  onDisconnect?: () => void;
}) {
  const meta = PLATFORM_META[platform];
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        position: "relative",
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "11px",
          background: meta.icon,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: tokens.mono,
          fontWeight: 700,
          color: tokens.bg,
        }}
      >
        {meta.short}
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <Typography sx={{ fontSize: 15, fontWeight: 600 }}>
          {meta.label}
        </Typography>
        <Typography
          sx={{
            fontFamily: tokens.mono,
            fontSize: "11.5px",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          {handle ? `@${handle}` : "not connected"}
        </Typography>
      </Box>
      {handle && onDisconnect && (
        <ButtonBase
          onClick={onDisconnect}
          title="Switch handle"
          sx={{
            ml: "auto",
            fontSize: 11.5,
            color: "rgba(255,255,255,0.3)",
            p: "4px 8px",
            borderRadius: "8px",
            "&:hover": {
              color: "rgba(255,255,255,0.7)",
              background: "rgba(255,255,255,0.05)",
            },
          }}
        >
          switch
        </ButtonBase>
      )}
    </Box>
  );
}

function ConnectBody({
  platform,
  onConnect,
  busy,
}: {
  platform: PlatformKey;
  onConnect: (handle: string) => void;
  busy: boolean;
}) {
  const [value, setValue] = useState("");
  const meta = PLATFORM_META[platform];
  const submit = () => value.trim() && onConnect(value.trim());
  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: "12px", mt: "auto" }}
    >
      <Typography sx={{ fontSize: "12.5px", color: "rgba(255,255,255,0.42)" }}>
        Add your {meta.label} handle to include it in the mix.
      </Typography>
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        sx={{ display: "flex", gap: "8px" }}
      >
        <InputBase
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`${meta.label.toLowerCase()} handle`}
          sx={{
            flex: 1,
            fontFamily: tokens.mono,
            fontSize: 13,
            color: "#fff",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "10px",
            px: "12px",
            py: "3px",
          }}
        />
        <ButtonBase
          onClick={submit}
          disabled={busy}
          sx={{
            fontFamily: tokens.sans,
            fontSize: "12.5px",
            fontWeight: 600,
            color: tokens.bg,
            background: meta.color,
            p: "8px 14px",
            borderRadius: "10px",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? (
            <CircularProgress
              size={14}
              thickness={6}
              sx={{ color: tokens.bg }}
            />
          ) : (
            "Connect"
          )}
        </ButtonBase>
      </Box>
    </Box>
  );
}

function FooterRow({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: "12.5px",
        color: "rgba(255,255,255,0.4)",
        pt: "14px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        mt: "auto",
      }}
    >
      {left}
      {right}
    </Box>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: "12.5px",
        color: "rgba(255,255,255,0.5)",
      }}
    >
      <span>{label}</span>
      <span style={{ fontFamily: tokens.mono }}>{value}</span>
    </Box>
  );
}

interface ConnectProps {
  onConnect: (handle: string) => void;
  busy: boolean;
}

function LCCard({
  stats,
  dim,
  connect,
  handle,
  onDisconnect,
}: {
  stats: Stats | null;
  dim: number;
  connect: ConnectProps;
  handle: string | null;
  onDisconnect: () => void;
}) {
  const meta = PLATFORM_META.leetcode;
  const t = stats?.totals;
  const total = t
    ? Math.max(1, t.easy.solved + t.medium.solved + t.hard.solved)
    : 1;
  return (
    <Card
      sx={{
        p: "24px",
        gap: "18px",
        borderRadius: "22px",
        opacity: dim,
        transition: "opacity .25s",
        flex: 1,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: -40,
          right: -30,
          width: 150,
          height: 150,
          borderRadius: "50%",
          background: `radial-gradient(circle,${meta.glow},transparent 65%)`,
          pointerEvents: "none",
        }}
      />
      <PlatformHeader
        platform="leetcode"
        handle={stats?.user.username ?? handle}
        onDisconnect={stats ? onDisconnect : undefined}
      />
      {t ? (
        <>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <Typography
              sx={{
                fontFamily: tokens.mono,
                fontSize: 34,
                fontWeight: 600,
                letterSpacing: "-1px",
                lineHeight: 1,
              }}
            >
              {fmt(t.solved)}
            </Typography>
            <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
              solved
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12.5px",
              }}
            >
              <span style={{ color: tokens.green }}>
                Easy {fmt(t.easy.solved)}
              </span>
              <span style={{ color: tokens.amber }}>
                Med {fmt(t.medium.solved)}
              </span>
              <span style={{ color: tokens.redText }}>
                Hard {fmt(t.hard.solved)}
              </span>
            </Box>
            <Box
              sx={{
                display: "flex",
                height: 7,
                borderRadius: "999px",
                overflow: "hidden",
                gap: "2px",
              }}
            >
              <Box
                sx={{
                  width: `${(t.easy.solved / total) * 100}%`,
                  background: tokens.green,
                }}
              />
              <Box
                sx={{
                  width: `${(t.medium.solved / total) * 100}%`,
                  background: tokens.amber,
                }}
              />
              <Box
                sx={{
                  width: `${(t.hard.solved / total) * 100}%`,
                  background: tokens.red,
                }}
              />
            </Box>
          </Box>
          <FooterRow
            left={
              <span>
                Rating{" "}
                <span
                  style={{
                    fontFamily: tokens.mono,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {stats!.contest ? fmt(stats!.contest.rating) : "—"}
                </span>
              </span>
            }
            right={
              stats!.contest?.topPercentage != null ? (
                <span style={{ color: tokens.greenBright }}>
                  Top {stats!.contest.topPercentage}%
                </span>
              ) : (
                <span />
              )
            }
          />
        </>
      ) : (
        <ConnectBody platform="leetcode" {...connect} />
      )}
    </Card>
  );
}

function CFCard({
  stats,
  dim,
  connect,
  handle,
  onDisconnect,
}: {
  stats: PlatformStats | null;
  dim: number;
  connect: ConnectProps;
  handle: string | null;
  onDisconnect: () => void;
}) {
  const meta = PLATFORM_META.codeforces;
  return (
    <Card
      sx={{
        p: "24px",
        gap: "18px",
        borderRadius: "22px",
        opacity: dim,
        transition: "opacity .25s",
        flex: 1,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: -40,
          right: -30,
          width: 150,
          height: 150,
          borderRadius: "50%",
          background: `radial-gradient(circle,${meta.glow},transparent 65%)`,
          pointerEvents: "none",
        }}
      />
      <PlatformHeader
        platform="codeforces"
        handle={stats?.user.handle ?? handle}
        onDisconnect={stats ? onDisconnect : undefined}
      />
      {stats ? (
        <>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <Typography
              sx={{
                fontFamily: tokens.mono,
                fontSize: 34,
                fontWeight: 600,
                letterSpacing: "-1px",
                lineHeight: 1,
                color: "oklch(0.72 0.16 25)",
              }}
            >
              {stats.rating != null ? fmt(stats.rating) : "—"}
            </Typography>
            {stats.user.rankTitle && (
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  p: "3px 9px",
                  borderRadius: "999px",
                  color: meta.pill.color,
                  background: meta.pill.bg,
                  textTransform: "capitalize",
                }}
              >
                {stats.user.rankTitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <StatRow
              label="Max rating"
              value={stats.maxRating != null ? fmt(stats.maxRating) : "—"}
            />
            <StatRow label="Problems solved" value={fmt(stats.solved)} />
          </Box>
          <FooterRow
            left={
              <span>
                Contests{" "}
                <span
                  style={{
                    fontFamily: tokens.mono,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {stats.contest ? fmt(stats.contest.attended) : 0}
                </span>
              </span>
            }
            right={
              stats.contest?.delta != null ? (
                <span
                  style={{
                    color:
                      stats.contest.delta >= 0 ? tokens.orange : tokens.redText,
                  }}
                >
                  {stats.contest.delta >= 0
                    ? `▲ +${stats.contest.delta}`
                    : `▼ ${stats.contest.delta}`}{" "}
                  last round
                </span>
              ) : (
                <span />
              )
            }
          />
        </>
      ) : (
        <ConnectBody platform="codeforces" {...connect} />
      )}
    </Card>
  );
}

function CCCard({
  stats,
  dim,
  connect,
  handle,
  onDisconnect,
}: {
  stats: PlatformStats | null;
  dim: number;
  connect: ConnectProps;
  handle: string | null;
  onDisconnect: () => void;
}) {
  const meta = PLATFORM_META.codechef;
  const division =
    stats?.rating != null
      ? stats.rating >= 2000
        ? 1
        : stats.rating >= 1600
          ? 2
          : stats.rating >= 1400
            ? 3
            : 4
      : null;
  return (
    <Card
      sx={{
        p: "24px",
        gap: "18px",
        borderRadius: "22px",
        opacity: dim,
        transition: "opacity .25s",
        flex: 1,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: -40,
          right: -30,
          width: 150,
          height: 150,
          borderRadius: "50%",
          background: `radial-gradient(circle,${meta.glow},transparent 65%)`,
          pointerEvents: "none",
        }}
      />
      <PlatformHeader
        platform="codechef"
        handle={stats?.user.handle ?? handle}
        onDisconnect={stats ? onDisconnect : undefined}
      />
      {stats ? (
        <>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <Typography
              sx={{
                fontFamily: tokens.mono,
                fontSize: 34,
                fontWeight: 600,
                letterSpacing: "-1px",
                lineHeight: 1,
                color: "oklch(0.72 0.14 285)",
              }}
            >
              {stats.rating != null ? fmt(stats.rating) : "—"}
            </Typography>
            {stats.user.stars != null && (
              <Typography
                sx={{
                  display: "flex",
                  gap: "2px",
                  alignItems: "center",
                  fontSize: 14,
                  color: tokens.orange,
                }}
              >
                {"★".repeat(Math.min(7, stats.user.stars))}
                <span style={{ color: "rgba(255,255,255,0.3)" }}>
                  {"★".repeat(Math.max(0, 7 - stats.user.stars))}
                </span>
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <StatRow
              label="Highest rating"
              value={stats.maxRating != null ? fmt(stats.maxRating) : "—"}
            />
            <StatRow label="Problems solved" value={fmt(stats.solved)} />
          </Box>
          <FooterRow
            left={
              <span>
                Contests{" "}
                <span
                  style={{
                    fontFamily: tokens.mono,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {stats.contest ? fmt(stats.contest.attended) : 0}
                </span>
              </span>
            }
            right={
              <span style={{ color: tokens.greenBright }}>
                {division ? `Div ${division}` : ""}
                {stats.globalRank != null
                  ? ` · Rank ${fmt(stats.globalRank)}`
                  : ""}
              </span>
            }
          />
        </>
      ) : (
        <ConnectBody platform="codechef" {...connect} />
      )}
    </Card>
  );
}

function RatingChart({
  lc,
  cf,
  cc,
  active,
}: {
  lc: Stats | null;
  cf: PlatformStats | null;
  cc: PlatformStats | null;
  active: PlatformKey | null;
}) {
  const { paths, labels } = useMemo(() => {
    const series = [
      {
        key: "leetcode" as const,
        color: PLATFORM_META.leetcode.color,
        history: lc?.contest?.history ?? [],
      },
      {
        key: "codeforces" as const,
        color: PLATFORM_META.codeforces.color,
        history: cf?.contest?.history ?? [],
      },
      {
        key: "codechef" as const,
        color: PLATFORM_META.codechef.color,
        history: cc?.contest?.history ?? [],
      },
    ]
      .filter((s) => !active || s.key === active)
      .map((s) => ({
        color: s.color,
        pts: s.history
          .filter((h) => h.date)
          .map((h) => ({ t: new Date(h.date!).getTime(), v: h.rating })),
      }))
      .filter((s) => s.pts.length >= 2);

    if (!series.length) return { paths: [], labels: [] };

    const allT = series.flatMap((s) => s.pts.map((p) => p.t));
    const allV = series.flatMap((s) => s.pts.map((p) => p.v));
    const t0 = Math.min(...allT);
    const t1 = Date.now();
    const vMin = Math.min(...allV) - 60;
    const vMax = Math.max(...allV) + 60;
    const W = 760;
    const H = 190;
    const pad = 12;
    const x = (t: number) =>
      pad + ((t - t0) / Math.max(1, t1 - t0)) * (W - 2 * pad);
    const y = (v: number) =>
      pad + (1 - (v - vMin) / Math.max(1, vMax - vMin)) * (H - 2 * pad);

    const paths = series.map((s) => {
      const line = s.pts
        .map(
          (p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`,
        )
        .join(" ");
      const last = s.pts[s.pts.length - 1];
      return { color: s.color, line, lastX: x(last.t), lastY: y(last.v) };
    });

    const labels: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(t0 + ((t1 - t0) * i) / 6);
      labels.push(
        d
          .toLocaleDateString("en-US", { month: "short", year: "2-digit" })
          .replace(" ", " '"),
      );
    }
    return { paths, labels };
  }, [lc, cf, cc, active]);

  return (
    <Card sx={{ gridArea: "rating", gap: "18px", borderRadius: "22px" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <Typography
            sx={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.3px" }}
          >
            Rating progression
          </Typography>
          <Typography
            sx={{ fontSize: "12.5px", color: "rgba(255,255,255,0.4)" }}
          >
            {active
              ? `${PLATFORM_META[active].label} rating over time`
              : "Rating across all three platforms over time"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: "16px", fontSize: 12 }}>
          {(["leetcode", "codeforces", "codechef"] as const)
            .filter((p) => !active || p === active)
            .map((p) => (
              <Box
                key={p}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                <Box
                  sx={{
                    width: 9,
                    height: 9,
                    borderRadius: "2px",
                    background: PLATFORM_META[p].color,
                  }}
                />
                {PLATFORM_META[p].label}
              </Box>
            ))}
        </Box>
      </Box>
      {paths.length ? (
        <>
          <svg
            viewBox="0 0 760 190"
            preserveAspectRatio="none"
            style={{ width: "100%", height: 190, display: "block" }}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
              <line
                key={i}
                x1={12}
                x2={748}
                y1={12 + f * 166}
                y2={12 + f * 166}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
              />
            ))}
            {paths.map((p, i) => (
              <g key={i}>
                <path
                  d={p.line}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={2.4}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <circle
                  cx={p.lastX}
                  cy={p.lastY}
                  r={8}
                  fill={p.color}
                  fillOpacity={0.2}
                />
                <circle cx={p.lastX} cy={p.lastY} r={4} fill={p.color} />
              </g>
            ))}
          </svg>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: tokens.mono,
              fontSize: 11,
              color: "rgba(255,255,255,0.32)",
            }}
          >
            {labels.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </Box>
        </>
      ) : (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 190,
            color: "rgba(255,255,255,0.35)",
            fontSize: 13.5,
          }}
        >
          Connect a platform with contest history to see rating progression
        </Box>
      )}
    </Card>
  );
}

function DonutCard({
  lc,
  cf,
  cc,
  active,
}: {
  lc: Stats | null;
  cf: PlatformStats | null;
  cc: PlatformStats | null;
  active: PlatformKey | null;
}) {
  const segs = [
    { key: "leetcode" as const, val: lc?.totals.solved ?? 0 },
    { key: "codeforces" as const, val: cf?.solved ?? 0 },
    { key: "codechef" as const, val: cc?.solved ?? 0 },
  ];
  const total = segs.reduce((s, x) => s + x.val, 0);
  const centerVal = active ? segs.find((s) => s.key === active)!.val : total;
  const centerLabel = active
    ? `${PLATFORM_META[active].label.toLowerCase()} solved`
    : "total solved";
  const R = 54;
  const C = 60;
  const SW = 16;
  const circ = 2 * Math.PI * R;
  let offset = 0;
  const bestRank = Math.min(
    ...([lc?.user.ranking, cc?.globalRank].filter(
      (n): n is number => n != null && n > 0,
    ) as number[]),
    Infinity,
  );
  const footer: { label: string; value: string } = !active
    ? {
        label: "Best global rank",
        value: Number.isFinite(bestRank) ? `#${fmt(bestRank)}` : "—",
      }
    : active === "leetcode"
      ? {
          label: "Global rank",
          value: lc?.user.ranking != null ? `#${fmt(lc.user.ranking)}` : "—",
        }
      : active === "codeforces"
        ? {
            label: "Max rating",
            value: cf?.maxRating != null ? fmt(cf.maxRating) : "—",
          }
        : {
            label: "Global rank",
            value: cc?.globalRank != null ? `#${fmt(cc.globalRank)}` : "—",
          };

  return (
    <Card
      gradient={tokens.aiGradient}
      sx={{
        gridArea: "platforms",
        gap: "20px",
        borderRadius: "22px",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <Typography
        sx={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.3px" }}
      >
        Solved by platform
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "center", p: "4px 0" }}>
        <svg viewBox="0 0 120 120" style={{ width: 150, height: 150 }}>
          <circle
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={SW}
          />
          {total > 0 &&
            segs.map((s) => {
              const len = (s.val / total) * circ;
              const el = (
                <circle
                  key={s.key}
                  cx={C}
                  cy={C}
                  r={R}
                  fill="none"
                  stroke={PLATFORM_META[s.key].color}
                  strokeOpacity={active && s.key !== active ? 0.16 : 1}
                  strokeWidth={SW}
                  strokeDasharray={`${len} ${circ - len}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${C} ${C})`}
                  style={{ transition: "stroke-opacity .25s" }}
                />
              );
              offset += len;
              return el;
            })}
          <text
            x={C}
            y={C - 4}
            textAnchor="middle"
            fill="#fff"
            fontFamily={tokens.mono}
            fontSize={20}
            fontWeight={600}
          >
            {fmt(centerVal)}
          </text>
          <text
            x={C}
            y={C + 14}
            textAnchor="middle"
            fill="rgba(255,255,255,0.4)"
            fontFamily={tokens.sans}
            fontSize={9}
          >
            {centerLabel}
          </text>
        </svg>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {segs.map((s) => {
          const pct = total ? Math.round((s.val / total) * 100) : 0;
          const meta = PLATFORM_META[s.key];
          return (
            <Box
              key={s.key}
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "7px",
                opacity: active && s.key !== active ? 0.35 : 1,
                transition: "opacity .25s",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                }}
              >
                <Box
                  component="span"
                  sx={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Box
                    component="span"
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "2px",
                      background: meta.color,
                    }}
                  />
                  {meta.label}
                </Box>
                <span
                  style={{
                    fontFamily: tokens.mono,
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  {fmt(s.val)} · {pct}%
                </span>
              </Box>
              <Box
                sx={{
                  height: 6,
                  borderRadius: "999px",
                  background: tokens.track,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    width: `${pct}%`,
                    borderRadius: "999px",
                    background: meta.color,
                  }}
                />
              </Box>
            </Box>
          );
        })}
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pt: "18px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          mt: "auto",
        }}
      >
        <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
          {footer.label}
        </Typography>
        <Typography
          sx={{
            fontFamily: tokens.mono,
            fontSize: 15,
            fontWeight: 600,
            color: tokens.greenBright,
          }}
        >
          {footer.value}
        </Typography>
      </Box>
    </Card>
  );
}

function UpcomingCard({
  upcoming,
  active,
}: {
  upcoming: UpcomingContest[];
  active: PlatformKey | null;
}) {
  const next = (
    active ? upcoming.filter((c) => c.platform === active) : upcoming
  ).slice(0, 3);
  const calLink = (c: UpcomingContest) => {
    const start = new Date(c.startsAt);
    const end = new Date(start.getTime() + (c.durationMins ?? 90) * 60000);
    const f = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(c.name)}&dates=${f(start)}/${f(end)}&details=${encodeURIComponent(c.url)}`;
  };
  return (
    <Card sx={{ gridArea: "upcoming", gap: "16px", borderRadius: "22px" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          sx={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.3px" }}
        >
          Upcoming contests
        </Typography>
        <Typography
          sx={{
            fontFamily: tokens.mono,
            fontSize: 12,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          {active ? PLATFORM_META[active].label : "all platforms"}
        </Typography>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3,1fr)" },
          gap: "12px",
        }}
      >
        {next.length === 0 && (
          <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            Nothing scheduled
          </Typography>
        )}
        {next.map((c) => {
          const meta = PLATFORM_META[c.platform];
          const start = new Date(c.startsAt);
          const days = Math.max(
            0,
            Math.round((start.getTime() - Date.now()) / 86_400_000),
          );
          const hhmm = start.toISOString().slice(11, 16);
          return (
            <Box
              key={c.url}
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                p: "16px",
                borderRadius: "15px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.055)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 600,
                    p: "3px 9px",
                    borderRadius: "999px",
                    color: meta.pill.color,
                    background: meta.pill.bg,
                  }}
                >
                  {meta.label}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: tokens.mono,
                    fontSize: "11.5px",
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  {start.toLocaleDateString("en-US", { weekday: "short" })}
                </Typography>
              </Box>
              <Typography
                component="a"
                href={c.url}
                target="_blank"
                rel="noreferrer"
                sx={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#fff",
                  textDecoration: "none",
                  "&:hover": { color: meta.pill.color },
                }}
              >
                {c.name}
              </Typography>
              <Typography
                sx={{
                  fontFamily: tokens.mono,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                {days === 0 ? "today" : `in ${days}d`} · {hhmm} UTC
              </Typography>
              <ButtonBase
                component="a"
                href={calLink(c)}
                target="_blank"
                rel="noreferrer"
                sx={{
                  fontFamily: tokens.sans,
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#fff",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  p: "8px",
                  borderRadius: "10px",
                  mt: "auto",
                }}
              >
                Set reminder
              </ButtonBase>
            </Box>
          );
        })}
      </Box>
    </Card>
  );
}

export default function AllPlatformsView({
  tab,
  lc,
  cf,
  cc,
  handles,
  upcoming,
  onConnect,
  onDisconnect,
  busy,
  deepDive,
}: {
  tab: Tab;
  lc: Stats | null;
  cf: PlatformStats | null;
  cc: PlatformStats | null;
  handles: { lc: string | null; cf: string | null; cc: string | null };
  upcoming: UpcomingContest[];
  onConnect: (platform: "lc" | "cf" | "cc", handle: string) => void;
  onDisconnect: (platform: "lc" | "cf" | "cc") => void;
  busy: { lc: boolean; cf: boolean; cc: boolean };
  deepDive?: React.ReactNode;
}) {
  const dim = (p: Tab) => (tab === "All platforms" || tab === p ? 1 : 0.28);
  const active: PlatformKey | null =
    tab === "LeetCode"
      ? "leetcode"
      : tab === "Codeforces"
        ? "codeforces"
        : tab === "CodeChef"
          ? "codechef"
          : null;

  const monthKey = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
  const now = new Date();
  const lastMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  const contestsThisMonth = (history: { date: string | null }[]) => {
    const dated = history.filter((h) => h.date);
    const thisM = dated.filter(
      (h) => monthKey(new Date(h.date!)) === monthKey(now),
    ).length;
    const lastM = dated.filter(
      (h) => monthKey(new Date(h.date!)) === monthKey(lastMonth),
    ).length;
    return { thisM, delta: thisM - lastM };
  };

  interface TileDef {
    label: string;
    value: React.ReactNode;
    sub: string;
    subColor?: string;
  }
  const daysVal = (n: number) => (
    <>
      {n}{" "}
      <span style={{ fontSize: 16, color: "rgba(255,255,255,0.5)" }}>days</span>
    </>
  );
  const monthTile = (history: { date: string | null }[]): TileDef => {
    const { thisM, delta } = contestsThisMonth(history);
    return {
      label: "Contests this month",
      value: fmt(thisM),
      sub:
        delta >= 0 ? `▲ +${delta} vs last month` : `▼ ${delta} vs last month`,
      subColor: delta >= 0 ? tokens.greenBright : tokens.redText,
    };
  };

  let tiles: TileDef[];
  if (active === "leetcode") {
    tiles = [
      {
        label: "Total solved",
        value: lc ? fmt(lc.totals.solved) : "—",
        sub: lc
          ? `of ${fmt(lc.totals.totalQuestions)} questions`
          : "not connected",
        subColor: PLATFORM_META.leetcode.pill.color,
      },
      {
        label: "Contest rating",
        value: lc?.contest ? fmt(lc.contest.rating) : "—",
        sub:
          lc?.contest?.topPercentage != null
            ? `Top ${lc.contest.topPercentage}%`
            : "no contests yet",
        subColor: tokens.greenBright,
      },
      {
        label: "Active streak",
        value: daysVal(lc?.streak.current ?? 0),
        sub: lc ? `best ${lc.streak.longest} days` : "not connected",
      },
      monthTile(lc?.contest?.history ?? []),
    ];
  } else if (active === "codeforces") {
    tiles = [
      {
        label: "Problems solved",
        value: cf ? fmt(cf.solved) : "—",
        sub: cf ? "Codeforces only" : "not connected",
        subColor: PLATFORM_META.codeforces.pill.color,
      },
      {
        label: "Contest rating",
        value: cf?.rating != null ? fmt(cf.rating) : "—",
        sub: cf?.user.rankTitle ?? "unrated",
        subColor: PLATFORM_META.codeforces.pill.color,
      },
      {
        label: "Active streak",
        value: daysVal(cf?.streak.current ?? 0),
        sub: cf ? `best ${cf.streak.longest} days` : "not connected",
      },
      monthTile(cf?.contest?.history ?? []),
    ];
  } else if (active === "codechef") {
    tiles = [
      {
        label: "Problems solved",
        value: cc ? fmt(cc.solved) : "—",
        sub: cc ? "CodeChef only" : "not connected",
        subColor: PLATFORM_META.codechef.pill.color,
      },
      {
        label: "Contest rating",
        value: cc?.rating != null ? fmt(cc.rating) : "—",
        sub: cc?.user.stars != null ? `${cc.user.stars}★ coder` : "unrated",
        subColor: tokens.orange,
      },
      {
        label: "Highest rating",
        value: cc?.maxRating != null ? fmt(cc.maxRating) : "—",
        sub: "all-time peak",
      },
      monthTile(cc?.contest?.history ?? []),
    ];
  } else {
    const platforms = [lc && "lc", cf && "cf", cc && "cc"].filter(Boolean);
    const totalSolved =
      (lc?.totals.solved ?? 0) + (cf?.solved ?? 0) + (cc?.solved ?? 0);
    const combinedRating =
      (lc?.contest?.rating ?? 0) + (cf?.rating ?? 0) + (cc?.rating ?? 0);
    const streak = mergedStreak([lc?.calendar ?? [], cf?.calendar ?? []]);
    tiles = [
      {
        label: "Total solved",
        value: fmt(totalSolved),
        sub: `across ${platforms.length} platform${platforms.length === 1 ? "" : "s"}`,
        subColor: tokens.greenBright,
      },
      {
        label: "Combined rating",
        value: fmt(combinedRating),
        sub: "sum of current ratings",
        subColor: tokens.orange,
      },
      {
        label: "Global active streak",
        value: daysVal(streak),
        sub: "any platform counts",
      },
      monthTile([
        ...(lc?.contest?.history ?? []),
        ...(cf?.contest?.history ?? []),
        ...(cc?.contest?.history ?? []),
      ]),
    ];
  }

  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2,1fr)",
            lg: "repeat(4,1fr)",
          },
          gap: "18px",
          mb: "18px",
        }}
      >
        {tiles.map((t) => (
          <SummaryTile
            key={t.label}
            label={t.label}
            value={t.value}
            sub={t.sub}
            subColor={t.subColor}
          />
        ))}
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: "18px",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3,1fr)" },
          mb: "18px",
        }}
      >
        <LCCard
          stats={lc}
          dim={dim("LeetCode")}
          handle={handles.lc}
          onDisconnect={() => onDisconnect("lc")}
          connect={{ onConnect: (h) => onConnect("lc", h), busy: busy.lc }}
        />
        <CFCard
          stats={cf}
          dim={dim("Codeforces")}
          handle={handles.cf}
          onDisconnect={() => onDisconnect("cf")}
          connect={{ onConnect: (h) => onConnect("cf", h), busy: busy.cf }}
        />
        <CCCard
          stats={cc}
          dim={dim("CodeChef")}
          handle={handles.cc}
          onDisconnect={() => onDisconnect("cc")}
          connect={{ onConnect: (h) => onConnect("cc", h), busy: busy.cc }}
        />
      </Box>

      {deepDive && <Box sx={{ mb: "18px" }}>{deepDive}</Box>}

      {active === "leetcode" ? (
        <UpcomingCard upcoming={upcoming} active={active} />
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: "18px",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3,1fr)" },
            gridTemplateAreas: {
              xs: `'rating' 'platforms' 'upcoming'`,
              md: `'rating rating platforms' 'upcoming upcoming platforms'`,
            },
          }}
        >
          <RatingChart lc={lc} cf={cf} cc={cc} active={active} />
          <DonutCard lc={lc} cf={cf} cc={cc} active={active} />
          <UpcomingCard upcoming={upcoming} active={active} />
        </Box>
      )}
    </>
  );
}
