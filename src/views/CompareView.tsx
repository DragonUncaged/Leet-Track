import { useCallback, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ButtonBase from '@mui/material/ButtonBase'
import InputBase from '@mui/material/InputBase'
import CircularProgress from '@mui/material/CircularProgress'
import { tokens } from '../theme'
import { getStats, syncProfile, getPlatform, syncPlatform } from '../api'
import type { Stats, PlatformStats, Handles } from '../types'
import Card, { Glow } from '../components/Card'

const RIVAL_KEY = 'leettrack-rival'
const RECENT_KEY = 'leettrack-rival-recent'

const YOU = 'oklch(0.72 0.15 150)'
const THEM = 'oklch(0.7 0.14 285)'
const YOU_TEXT = 'oklch(0.82 0.13 150)'
const THEM_TEXT = 'oklch(0.74 0.14 285)'

type PKey = 'Combined' | 'LeetCode' | 'Codeforces' | 'CodeChef'
const P_KEYS: PKey[] = ['Combined', 'LeetCode', 'Codeforces', 'CodeChef']

export interface Side {
  lc: Stats | null
  cf: PlatformStats | null
  cc: PlatformStats | null
}

const num = (n: number) => n.toLocaleString('en-US')

const firstName = (s: Stats) => s.user.realName?.split(' ')[0] || `@${s.user.username}`

function loadRivalHandles(): Handles {
  const raw = localStorage.getItem(RIVAL_KEY)
  if (!raw) return { lc: null, cf: null, cc: null }
  try {
    const p = JSON.parse(raw)
    if (p && typeof p === 'object') return { lc: null, cf: null, cc: null, ...p }
  } catch {
    // legacy format: a bare LeetCode username
  }
  return { lc: raw, cf: null, cc: null }
}

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return []
}

function pushRecent(handle: string) {
  const next = [handle, ...loadRecents().filter((h) => h.toLowerCase() !== handle.toLowerCase())].slice(0, 4)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  return next
}

function Avatar({ stats, color, size = 64 }: { stats: Stats; color: 'you' | 'them'; size?: number }) {
  const grad =
    color === 'you'
      ? 'linear-gradient(150deg,oklch(0.72 0.15 150),oklch(0.5 0.13 155))'
      : 'linear-gradient(150deg,oklch(0.7 0.14 285),oklch(0.5 0.14 290))'
  if (stats.user.avatar) {
    return (
      <Box
        component="img"
        src={stats.user.avatar}
        alt={stats.user.username}
        sx={{ width: size, height: size, borderRadius: '18px', objectFit: 'cover', display: 'block' }}
      />
    )
  }
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '18px',
        background: grad,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: tokens.mono,
        fontSize: size * 0.375,
        fontWeight: 600,
        color: tokens.bg,
      }}
    >
      {stats.user.username[0]?.toUpperCase()}
    </Box>
  )
}

// ---- Metrics ----------------------------------------------------------------

interface Metric {
  label: string
  a: number
  b: number
  fa: string
  fb: string
}

const metric = (
  label: string,
  a: number | null | undefined,
  b: number | null | undefined,
  fmt: (v: number) => string = num,
): Metric => ({
  label,
  a: a ?? 0,
  b: b ?? 0,
  fa: a == null ? '—' : fmt(a),
  fb: b == null ? '—' : fmt(b),
})

const days = (v: number) => `${v} d`

function lcMetrics(a: Stats, b: Stats): Metric[] {
  const pct = (s: Stats) => s.contest?.topPercentage ?? null
  return [
    metric('Total solved', a.totals.solved, b.totals.solved),
    metric('Contest rating', a.contest?.rating, b.contest?.rating),
    metric('Current streak', a.streak.current, b.streak.current, days),
    metric('Max streak', a.streak.longest, b.streak.longest, days),
    metric('Acceptance rate', a.totals.acceptance, b.totals.acceptance, (v) => `${v}%`),
    metric('Contests attended', a.contest?.attended, b.contest?.attended),
    {
      label: 'Global percentile',
      a: pct(a) != null ? 100 - pct(a)! : 0,
      b: pct(b) != null ? 100 - pct(b)! : 0,
      fa: pct(a) != null ? `Top ${pct(a)}%` : '—',
      fb: pct(b) != null ? `Top ${pct(b)}%` : '—',
    },
  ]
}

function cfMetrics(a: PlatformStats, b: PlatformStats): Metric[] {
  return [
    metric('Problems solved', a.solved, b.solved),
    metric('Current rating', a.rating, b.rating),
    metric('Max rating', a.maxRating, b.maxRating),
    metric('Current streak', a.streak.current, b.streak.current, days),
    metric('Max streak', a.streak.longest, b.streak.longest, days),
    metric('Acceptance rate', a.acceptance, b.acceptance, (v) => `${v}%`),
    metric('Contests attended', a.contest?.attended, b.contest?.attended),
  ]
}

function ccMetrics(a: PlatformStats, b: PlatformStats): Metric[] {
  return [
    metric('Problems solved', a.solved, b.solved),
    metric('Current rating', a.rating, b.rating),
    metric('Highest rating', a.maxRating, b.maxRating),
    metric('Stars', a.user.stars, b.user.stars, (v) => `${v}★`),
    metric('Contests attended', a.contest?.attended, b.contest?.attended),
  ]
}

function totalSolved(s: Side) {
  return (s.lc?.totals.solved ?? 0) + (s.cf?.solved ?? 0) + (s.cc?.solved ?? 0)
}

function combinedRating(s: Side): number | null {
  const vals = [s.lc?.contest?.rating, s.cf?.rating, s.cc?.rating].filter((v): v is number => v != null)
  return vals.length ? vals.reduce((t, v) => t + v, 0) : null
}

function peakRating(s: Side): number | null {
  const vals = [s.lc?.contest?.peak, s.cf?.maxRating, s.cc?.maxRating].filter((v): v is number => v != null)
  return vals.length ? Math.max(...vals) : null
}

function mergedStreak(s: Side): number {
  const active = new Set<string>()
  for (const cal of [s.lc?.calendar, s.cf?.calendar, s.cc?.calendar]) {
    for (const d of cal ?? []) if (d.count > 0) active.add(d.date)
  }
  const isoDay = (dt: Date) => dt.toISOString().slice(0, 10)
  let current = 0
  const back = new Date()
  if (!active.has(isoDay(back))) back.setDate(back.getDate() - 1)
  while (active.has(isoDay(back))) {
    current++
    back.setDate(back.getDate() - 1)
  }
  return current
}

function combinedMetrics(a: Side, b: Side): Metric[] {
  const contests = (s: Side) =>
    (s.lc?.contest?.attended ?? 0) + (s.cf?.contest?.attended ?? 0) + (s.cc?.contest?.attended ?? 0)
  const platforms = (s: Side) => [s.lc, s.cf, s.cc].filter(Boolean).length
  return [
    metric('Total solved', totalSolved(a), totalSolved(b)),
    metric('Combined rating', combinedRating(a), combinedRating(b)),
    metric('Peak rating (any)', peakRating(a), peakRating(b)),
    metric('Global active streak', mergedStreak(a), mergedStreak(b), days),
    metric('Total contests', contests(a), contests(b)),
    metric('Platforms tracked', platforms(a), platforms(b)),
  ]
}

function MetricRow({ m }: { m: Metric }) {
  const tot = m.a + m.b
  const aPct = tot > 0 ? (m.a / tot) * 100 : 0
  const bPct = tot > 0 ? (m.b / tot) * 100 : 0
  const aWins = m.a > m.b
  const bWins = m.b > m.a
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography sx={{ fontFamily: tokens.mono, fontSize: 13, fontWeight: 600, color: aWins ? YOU_TEXT : 'rgba(255,255,255,0.55)' }}>
          {m.fa}
        </Typography>
        <Typography sx={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.42)' }}>{m.label}</Typography>
        <Typography sx={{ fontFamily: tokens.mono, fontSize: 13, fontWeight: 600, color: bWins ? THEM_TEXT : 'rgba(255,255,255,0.55)' }}>
          {m.fb}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', height: 9 }}>
        <Box sx={{ flex: 1, height: '100%', display: 'flex', justifyContent: 'flex-end' }}>
          <Box sx={{ width: `${aPct}%`, height: '100%', borderRadius: '999px 0 0 999px', background: YOU, opacity: aWins ? 1 : 0.5 }} />
        </Box>
        <Box sx={{ flex: 1, height: '100%' }}>
          <Box sx={{ width: `${bPct}%`, height: '100%', borderRadius: '0 999px 999px 0', background: THEM, opacity: bWins ? 1 : 0.5 }} />
        </Box>
      </Box>
    </Box>
  )
}

// ---- Radar ------------------------------------------------------------------

const TAG_ABBREV: Record<string, string> = {
  'Dynamic Programming': 'DP',
  'Depth-First Search': 'DFS',
  'Breadth-First Search': 'BFS',
  'Binary Search': 'Bin Search',
  'Hash Table': 'Hashing',
  'Two Pointers': '2 Pointers',
  'Sliding Window': 'Sliding Win',
  'Divide and Conquer': 'D&C',
  'Heap (Priority Queue)': 'Heap',
  'Binary Tree': 'Bin Tree',
  'Union Find': 'Union Find',
  Backtracking: 'Backtrack',
}

const tagLabel = (name: string) => TAG_ABBREV[name] ?? (name.length > 11 ? `${name.slice(0, 10)}…` : name)

function buildAxes(you: Stats, them: Stats) {
  const byName = new Map<string, { name: string; a: number; b: number }>()
  for (const t of you.tags) byName.set(t.name, { name: t.name, a: t.solved, b: 0 })
  for (const t of them.tags) {
    const cur = byName.get(t.name)
    if (cur) cur.b = t.solved
    else byName.set(t.name, { name: t.name, a: 0, b: t.solved })
  }
  return [...byName.values()].sort((x, y) => y.a + y.b - (x.a + x.b)).slice(0, 6)
}

function Radar({ axes }: { axes: { name: string; a: number; b: number }[] }) {
  const n = axes.length
  const pt = (i: number, r: number): [number, number] => {
    const ang = -Math.PI / 2 + (i / n) * 2 * Math.PI
    return [130 + Math.cos(ang) * 92 * r, 125 + Math.sin(ang) * 92 * r]
  }
  const ring = (r: number) => axes.map((_, i) => pt(i, r).map((v) => v.toFixed(1)).join(',')).join(' ')
  const norm = axes.map((ax) => {
    const max = Math.max(ax.a, ax.b, 1)
    return { a: ax.a / max, b: ax.b / max }
  })
  const poly = (key: 'a' | 'b') =>
    norm.map((v, i) => pt(i, Math.max(v[key], 0.04)).map((c) => c.toFixed(1)).join(',')).join(' ')
  return (
    <svg viewBox="0 0 260 260" style={{ width: '100%', height: 260, display: 'block' }}>
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon key={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} points={ring(r)} />
      ))}
      {axes.map((_, i) => {
        const p = pt(i, 1)
        return <line key={i} x1={130} y1={125} x2={p[0]} y2={p[1]} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      })}
      <polygon fill={THEM} fillOpacity={0.14} stroke={THEM} strokeWidth={2} strokeLinejoin="round" points={poly('b')} />
      <polygon fill={YOU} fillOpacity={0.14} stroke={YOU} strokeWidth={2} strokeLinejoin="round" points={poly('a')} />
      {axes.map((ax, i) => {
        const p = pt(i, 1.22)
        return (
          <text
            key={ax.name}
            x={p[0]}
            y={p[1]}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255,255,255,0.5)"
            fontFamily="Space Grotesk, sans-serif"
            fontSize={11}
          >
            {tagLabel(ax.name)}
          </text>
        )
      })}
    </svg>
  )
}

// ---- Timeline ---------------------------------------------------------------

interface SeriesPoint {
  t: number
  v: number
}

type History = { title: string; rating: number; rank: number | null; date: string | null }[] | undefined

function toSeries(history: History): SeriesPoint[] {
  return (history ?? [])
    .filter((h) => h.date)
    .map((h) => ({ t: new Date(`${h.date}T00:00:00Z`).getTime(), v: h.rating }))
    .sort((x, y) => x.t - y.t)
}

// Combined side series: union of contest dates, carry-forward sum of each
// platform's latest rating at that date.
function sideSeries(pk: PKey, side: Side): SeriesPoint[] {
  if (pk === 'LeetCode') return toSeries(side.lc?.contest?.history)
  if (pk === 'Codeforces') return toSeries(side.cf?.contest?.history)
  if (pk === 'CodeChef') return toSeries(side.cc?.contest?.history)
  const lists = [side.lc?.contest?.history, side.cf?.contest?.history, side.cc?.contest?.history]
    .map(toSeries)
    .filter((s) => s.length)
  const ts = [...new Set(lists.flat().map((p) => p.t))].sort((a, b) => a - b)
  return ts.map((t) => {
    let v = 0
    for (const s of lists) {
      let last: number | null = null
      for (const p of s) {
        if (p.t <= t) last = p.v
        else break
      }
      if (last != null) v += last
    }
    return { t, v }
  })
}

function monthLabel(t: number) {
  const d = new Date(t)
  return `${d.toLocaleString('en-US', { month: 'short' })} '${String(d.getFullYear()).slice(2)}`
}

function Timeline({ youPts, themPts }: { youPts: SeriesPoint[]; themPts: SeriesPoint[] }) {
  const W = 900
  const H = 200
  const pad = 14
  const all = [...youPts, ...themPts]
  const minT = Math.min(...all.map((p) => p.t))
  const maxT = Math.max(...all.map((p) => p.t))
  const minV = Math.min(...all.map((p) => p.v)) - 40
  const maxV = Math.max(...all.map((p) => p.v)) + 40
  const x = (t: number) => pad + (maxT === minT ? 0.5 : (t - minT) / (maxT - minT)) * (W - 2 * pad)
  const y = (v: number) => pad + (1 - (v - minV) / (maxV - minV)) * (H - 2 * pad)
  const lineOf = (pts: SeriesPoint[]) =>
    pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')
  const areaOf = (pts: SeriesPoint[]) =>
    `${lineOf(pts)} L ${x(pts[pts.length - 1].t).toFixed(1)} ${H - pad} L ${x(pts[0].t).toFixed(1)} ${H - pad} Z`
  const ticks = Array.from({ length: 7 }, (_, i) => minT + (i / 6) * (maxT - minT))
  const seriesEl = (pts: SeriesPoint[], color: string, id: string) => {
    if (!pts.length) return null
    const last = pts[pts.length - 1]
    return (
      <g>
        <path d={areaOf(pts)} fill={`url(#${id})`} />
        <path d={lineOf(pts)} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(last.t)} cy={y(last.v)} r={4} fill={color} />
      </g>
    )
  }
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 200, display: 'block' }}>
        <defs>
          <linearGradient id="cmp-you" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={YOU} stopOpacity={0.22} />
            <stop offset="100%" stopColor={YOU} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="cmp-them" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={THEM} stopOpacity={0.22} />
            <stop offset="100%" stopColor={THEM} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={pad} x2={W - pad} y1={pad + f * (H - 2 * pad)} y2={pad + f * (H - 2 * pad)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        ))}
        {seriesEl(themPts, THEM, 'cmp-them')}
        {seriesEl(youPts, YOU, 'cmp-you')}
      </svg>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontFamily: tokens.mono, fontSize: 11, color: 'rgba(255,255,255,0.32)' }}>
        {ticks.map((t, i) => (
          <span key={i}>{monthLabel(t)}</span>
        ))}
      </Box>
    </>
  )
}

// ---- Difficulty / breakdown -------------------------------------------------

interface DiffRowData {
  label: string
  color: string
  a: number
  b: number
}

function buildDiff(pk: PKey, you: Side, them: Side): { title: string; rows: DiffRowData[] } {
  if (pk === 'LeetCode') {
    const a = you.lc!
    const b = them.lc!
    return {
      title: 'Solved by difficulty',
      rows: [
        { label: 'Easy', color: tokens.green, a: a.totals.easy.solved, b: b.totals.easy.solved },
        { label: 'Medium', color: tokens.amber, a: a.totals.medium.solved, b: b.totals.medium.solved },
        { label: 'Hard', color: tokens.redText, a: a.totals.hard.solved, b: b.totals.hard.solved },
      ],
    }
  }
  if (pk === 'Codeforces') {
    const colors = [tokens.green, tokens.amber, tokens.redText]
    return {
      title: 'Solved by problem rating',
      rows: (you.cf?.breakdown ?? []).map((r, i) => ({
        label: r.label,
        color: colors[i % colors.length],
        a: r.count,
        b: them.cf?.breakdown[i]?.count ?? 0,
      })),
    }
  }
  if (pk === 'CodeChef') {
    const colors = [tokens.violet, tokens.green, tokens.amber, tokens.redText]
    return {
      title: 'Contests by division',
      rows: (you.cc?.breakdown ?? [])
        .map((r, i) => ({
          label: r.label,
          color: colors[i % colors.length],
          a: r.count,
          b: them.cc?.breakdown[i]?.count ?? 0,
        }))
        .filter((r) => r.a > 0 || r.b > 0),
    }
  }
  return {
    title: 'Solved across all platforms',
    rows: [
      { label: 'LeetCode', color: tokens.orange, a: you.lc?.totals.solved ?? 0, b: them.lc?.totals.solved ?? 0 },
      { label: 'Codeforces', color: tokens.redText, a: you.cf?.solved ?? 0, b: them.cf?.solved ?? 0 },
      { label: 'CodeChef', color: tokens.violet, a: you.cc?.solved ?? 0, b: them.cc?.solved ?? 0 },
    ].filter((r) => r.a > 0 || r.b > 0),
  }
}

function DiffRow({ row, max }: { row: DiffRowData; max: number }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <Typography sx={{ fontSize: 13, color: row.color }}>{row.label}</Typography>
        <Typography sx={{ fontFamily: tokens.mono, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          {num(row.a)} vs {num(row.b)}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Box sx={{ flex: 1, height: 8, borderRadius: '999px', background: tokens.track, display: 'flex', justifyContent: 'flex-end', overflow: 'hidden' }}>
          <Box sx={{ width: `${(row.a / max) * 100}%`, height: '100%', borderRadius: '999px', background: YOU }} />
        </Box>
        <Box sx={{ flex: 1, height: 8, borderRadius: '999px', background: tokens.track, overflow: 'hidden' }}>
          <Box sx={{ width: `${(row.b / max) * 100}%`, height: '100%', borderRadius: '999px', background: THEM }} />
        </Box>
      </Box>
    </Box>
  )
}

// ---- Small centered panels --------------------------------------------------

function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <Card sx={{ maxWidth: 480, mx: 'auto', mt: '6vh', p: '32px', gap: '18px' }}>
      {children}
    </Card>
  )
}

function PrimaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      sx={{
        fontFamily: tokens.sans,
        fontSize: '13.5px',
        fontWeight: 600,
        color: tokens.bg,
        background: tokens.greenBright,
        p: '10px 16px',
        borderRadius: '10px',
        alignSelf: 'flex-start',
        opacity: disabled ? 0.7 : 1,
        '&:hover': { background: 'oklch(0.86 0.13 150)' },
      }}
    >
      {children}
    </ButtonBase>
  )
}

function LinkRivalPanel({
  platform,
  rivalName,
  suggestion,
  busy,
  error,
  onLink,
}: {
  platform: 'Codeforces' | 'CodeChef'
  rivalName: string
  suggestion: string
  busy: boolean
  error: string | null
  onLink: (handle: string) => void
}) {
  const [value, setValue] = useState(suggestion)
  const submit = () => {
    if (value.trim() && !busy) onLink(value.trim())
  }
  return (
    <CenterCard>
      <Typography sx={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.4px' }}>
        Link {rivalName}&apos;s {platform}
      </Typography>
      <Typography sx={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.45)' }}>
        Usernames can differ between sites. Enter their {platform} handle — it may well be the same one.
      </Typography>
      <Box sx={{ display: 'flex', gap: '10px' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            p: '2px 14px',
            flex: 1,
          }}
        >
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
          <InputBase
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={`${platform} handle…`}
            sx={{ fontFamily: tokens.mono, fontSize: '13.5px', color: '#fff', flex: 1, '& input::placeholder': { color: 'rgba(255,255,255,0.55)', opacity: 1 } }}
          />
        </Box>
        <PrimaryButton onClick={submit} disabled={busy || !value.trim()}>
          {busy ? <CircularProgress size={13} thickness={6} sx={{ color: tokens.bg }} /> : 'Link'}
        </PrimaryButton>
      </Box>
      {error && <Typography sx={{ fontSize: 13, color: tokens.redText }}>{error}</Typography>}
    </CenterCard>
  )
}

// ---- Empty state ------------------------------------------------------------

const CHIP_GRADS = [
  'linear-gradient(150deg,oklch(0.7 0.14 285),oklch(0.5 0.14 290))',
  'linear-gradient(150deg,oklch(0.78 0.14 60),oklch(0.6 0.13 45))',
  'linear-gradient(150deg,oklch(0.66 0.16 25),oklch(0.55 0.15 15))',
  'linear-gradient(150deg,oklch(0.7 0.13 245),oklch(0.55 0.12 250))',
]

function EmptyState({
  you,
  recents,
  busy,
  error,
  onCompare,
}: {
  you: Stats
  recents: string[]
  busy: boolean
  error: string | null
  onCompare: (handle: string) => void
}) {
  const [value, setValue] = useState('')
  const submit = () => {
    if (value.trim() && !busy) onCompare(value.trim())
  }
  return (
    <Card sx={{ borderRadius: '24px', p: '72px 40px', alignItems: 'center', textAlign: 'center', gap: '22px' }}>
      <Glow color="oklch(0.6 0.13 200 / 0.14)" sx={{ top: -40, left: '50%', transform: 'translateX(-50%)', width: 340, height: 260 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
        <Avatar stats={you} color="you" />
        <Typography sx={{ fontFamily: tokens.mono, fontSize: 26, fontWeight: 600, color: 'rgba(255,255,255,0.28)', letterSpacing: '2px' }}>
          VS
        </Typography>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '18px',
            border: '1.5px dashed rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          +
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
        <Typography sx={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.4px' }}>Add a competitor to compare</Typography>
        <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 440, textWrap: 'pretty' }}>
          Enter any public LeetCode username to start, then link their Codeforces and CodeChef handles for a full
          cross-platform head-to-head.
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: '10px', position: 'relative', mt: '4px' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            p: '2px 16px',
            minWidth: 260,
          }}
        >
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
          <InputBase
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Enter a LeetCode username…"
            sx={{ fontFamily: tokens.mono, fontSize: 14, color: '#fff', flex: 1, '& input::placeholder': { color: 'rgba(255,255,255,0.55)', opacity: 1 } }}
          />
        </Box>
        <ButtonBase
          onClick={submit}
          disabled={busy || !value.trim()}
          sx={{
            fontFamily: tokens.sans,
            fontSize: 14,
            fontWeight: 600,
            color: tokens.bg,
            background: tokens.greenBright,
            p: '12px 22px',
            borderRadius: '12px',
            opacity: busy || !value.trim() ? 0.7 : 1,
            '&:hover': { background: 'oklch(0.86 0.13 150)' },
          }}
        >
          {busy ? <CircularProgress size={14} thickness={6} sx={{ color: tokens.bg }} /> : 'Compare'}
        </ButtonBase>
      </Box>
      {error && (
        <Typography sx={{ fontSize: 13, color: tokens.redText, position: 'relative' }}>{error}</Typography>
      )}
      {recents.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', mt: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.35)' }}>Recently compared</Typography>
          <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {recents.map((h, i) => (
              <ButtonBase
                key={h}
                onClick={() => !busy && onCompare(h)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  fontSize: '12.5px',
                  color: 'rgba(255,255,255,0.6)',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '999px',
                  p: '6px 12px',
                  '&:hover': { color: '#fff', borderColor: 'rgba(255,255,255,0.18)' },
                }}
              >
                <Box sx={{ width: 16, height: 16, borderRadius: '5px', background: CHIP_GRADS[i % CHIP_GRADS.length] }} />@{h}
              </ButtonBase>
            ))}
          </Box>
        </Box>
      )}
    </Card>
  )
}

// ---- Main view --------------------------------------------------------------

export default function CompareView({ you, onGoConnect }: { you: Side; onGoConnect: () => void }) {
  const [platform, setPlatform] = useState<PKey>('Combined')
  const [rivalHandles, setRivalHandles] = useState<Handles>(loadRivalHandles)
  const [rival, setRival] = useState<Side>({ lc: null, cf: null, cc: null })
  const [recents, setRecents] = useState<string[]>(loadRecents)
  const [busy, setBusy] = useState({ lc: false, cf: false, cc: false })
  const [errors, setErrors] = useState<{ lc: string | null; cf: string | null; cc: string | null }>({
    lc: null,
    cf: null,
    cc: null,
  })

  const saveRivalHandles = (next: Handles) => {
    setRivalHandles(next)
    localStorage.setItem(RIVAL_KEY, JSON.stringify(next))
  }
  const setBusyFor = (p: 'lc' | 'cf' | 'cc', v: boolean) => setBusy((b) => ({ ...b, [p]: v }))
  const setErrorFor = (p: 'lc' | 'cf' | 'cc', v: string | null) => setErrors((e) => ({ ...e, [p]: v }))

  const compare = useCallback(
    (handle: string) => {
      if (you.lc && handle.toLowerCase() === you.lc.user.username.toLowerCase()) {
        setErrorFor('lc', "That's you — pick someone else to race against.")
        return
      }
      setBusyFor('lc', true)
      setErrorFor('lc', null)
      syncProfile(handle)
        .then((s) => {
          setRival({ lc: s, cf: null, cc: null })
          saveRivalHandles({ lc: s.user.username, cf: null, cc: null })
          setRecents(pushRecent(s.user.username))
        })
        .catch((e: Error) => setErrorFor('lc', e.message))
        .finally(() => setBusyFor('lc', false))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [you.lc],
  )

  const linkPlatform = useCallback(
    (p: 'cf' | 'cc', handle: string) => {
      const own = p === 'cf' ? you.cf?.user.handle : you.cc?.user.handle
      if (own && handle.toLowerCase() === own.toLowerCase()) {
        setErrorFor(p, "That's your own handle on this platform.")
        return
      }
      setBusyFor(p, true)
      setErrorFor(p, null)
      syncPlatform(p, handle)
        .then((s) => {
          setRival((r) => ({ ...r, [p]: s }))
          saveRivalHandles({ ...rivalHandles, [p]: s.user.handle })
        })
        .catch((e: Error) => setErrorFor(p, e.message))
        .finally(() => setBusyFor(p, false))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [you.cf, you.cc, rivalHandles],
  )

  useEffect(() => {
    const h = loadRivalHandles()
    const load = <T,>(get: () => Promise<T>, sync: () => Promise<T>, apply: (s: T) => void, clear: () => void) =>
      get()
        .then(apply)
        .catch(() => sync().then(apply).catch(clear))
    if (h.lc) {
      load(
        () => getStats(h.lc!),
        () => syncProfile(h.lc!),
        (s) => setRival((r) => ({ ...r, lc: s })),
        () => saveRivalHandles({ lc: null, cf: null, cc: null }),
      )
    }
    if (h.cf) {
      load(
        () => getPlatform('cf', h.cf!),
        () => syncPlatform('cf', h.cf!),
        (s) => setRival((r) => ({ ...r, cf: s })),
        () => {},
      )
    }
    if (h.cc) {
      load(
        () => getPlatform('cc', h.cc!),
        () => syncPlatform('cc', h.cc!),
        (s) => setRival((r) => ({ ...r, cc: s })),
        () => {},
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clearRival = () => {
    setRival({ lc: null, cf: null, cc: null })
    saveRivalHandles({ lc: null, cf: null, cc: null })
    localStorage.removeItem(RIVAL_KEY)
  }

  if (!you.lc) {
    return (
      <CenterCard>
        <Typography sx={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.4px' }}>Connect LeetCode first</Typography>
        <Typography sx={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.45)' }}>
          Compare needs your own LeetCode profile as the baseline. Connect it on the All platforms tab, then come back
          to pick a rival.
        </Typography>
        <PrimaryButton onClick={onGoConnect}>Go to All platforms</PrimaryButton>
      </CenterCard>
    )
  }

  if (!rival.lc) {
    return <EmptyState you={you.lc} recents={recents} busy={busy.lc} error={errors.lc} onCompare={compare} />
  }

  const themName = firstName(rival.lc)

  // Per-platform gating
  const yourPlatform = platform === 'Codeforces' ? you.cf : platform === 'CodeChef' ? you.cc : you.lc
  const rivalPlatform = platform === 'Codeforces' ? rival.cf : platform === 'CodeChef' ? rival.cc : rival.lc
  const pShort = platform === 'Codeforces' ? 'cf' : 'cc'

  const switcher = (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '18px', flexWrap: 'wrap', gap: '12px' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Comparing on</Typography>
        <Box
          sx={{
            display: 'flex',
            gap: '4px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '11px',
            p: '4px',
          }}
        >
          {P_KEYS.map((p) => {
            const active = p === platform
            return (
              <ButtonBase
                key={p}
                onClick={() => setPlatform(p)}
                sx={{
                  fontFamily: tokens.sans,
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  p: '7px 15px',
                  borderRadius: '8px',
                  transition: 'all .18s',
                  '&:hover': { color: '#fff' },
                }}
              >
                {p}
              </ButtonBase>
            )
          })}
        </Box>
      </Box>
      <ButtonBase
        onClick={clearRival}
        sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'rgba(255,255,255,0.7)' } }}
      >
        vs @{rival.lc.user.username} · switch rival
      </ButtonBase>
    </Box>
  )

  if ((platform === 'Codeforces' || platform === 'CodeChef') && !yourPlatform) {
    return (
      <>
        {switcher}
        <CenterCard>
          <Typography sx={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.4px' }}>
            Connect your {platform} first
          </Typography>
          <Typography sx={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.45)' }}>
            You haven&apos;t linked your own {platform} handle yet. Add it on the All platforms tab, then compare here.
          </Typography>
          <PrimaryButton onClick={onGoConnect}>Go to All platforms</PrimaryButton>
        </CenterCard>
      </>
    )
  }

  if ((platform === 'Codeforces' || platform === 'CodeChef') && !rivalPlatform) {
    return (
      <>
        {switcher}
        <LinkRivalPanel
          key={platform}
          platform={platform}
          rivalName={themName}
          suggestion={rival.lc.user.username}
          busy={busy[pShort]}
          error={errors[pShort]}
          onLink={(h) => linkPlatform(pShort, h)}
        />
      </>
    )
  }

  // ---- Build the active view ----
  const metrics =
    platform === 'LeetCode'
      ? lcMetrics(you.lc, rival.lc)
      : platform === 'Codeforces'
        ? cfMetrics(you.cf!, rival.cf!)
        : platform === 'CodeChef'
          ? ccMetrics(you.cc!, rival.cc!)
          : combinedMetrics(you, rival)
  const youWins = metrics.filter((m) => m.a > m.b).length
  const themWins = metrics.filter((m) => m.b > m.a).length

  const axes = buildAxes(you.lc, rival.lc)
  const edges = axes.map((ax) => ({ name: ax.name, d: (ax.a - ax.b) / Math.max(ax.a, ax.b, 1) }))
  const yourEdge = [...edges].sort((x, y) => y.d - x.d)[0]
  const theirEdge = [...edges].sort((x, y) => x.d - y.d)[0]

  const diff = buildDiff(platform, you, rival)
  const diffMax = Math.max(...diff.rows.flatMap((r) => [r.a, r.b]), 1)
  const youLead = diff.rows.filter((r) => r.a > r.b).map((r) => r.label)
  const themLead = diff.rows.filter((r) => r.b > r.a).map((r) => r.label)

  const cutoff = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 12)
    return d.getTime()
  })()
  const youAll = sideSeries(platform, you)
  const themAll = sideSeries(platform, rival)
  let youPts = youAll.filter((p) => p.t >= cutoff)
  let themPts = themAll.filter((p) => p.t >= cutoff)
  let windowed = true
  if (youPts.length < 2 || themPts.length < 2) {
    youPts = youAll
    themPts = themAll
    windowed = false
  }
  const hasTimeline = youPts.length >= 2 && themPts.length >= 2

  const youRating =
    platform === 'LeetCode'
      ? you.lc.contest?.rating ?? null
      : platform === 'Codeforces'
        ? you.cf!.rating
        : platform === 'CodeChef'
          ? you.cc!.rating
          : combinedRating(you)
  const themRating =
    platform === 'LeetCode'
      ? rival.lc.contest?.rating ?? null
      : platform === 'Codeforces'
        ? rival.cf!.rating
        : platform === 'CodeChef'
          ? rival.cc!.rating
          : combinedRating(rival)

  let gapLine: React.ReactNode = null
  if (youRating != null && themRating != null) {
    const gapNow = themRating - youRating
    let trend = ''
    if (hasTimeline) {
      const startGap = themPts[0].v - youPts[0].v
      const closed = Math.round(startGap - gapNow)
      const since = monthLabel(Math.max(youPts[0].t, themPts[0].t))
      if (closed > 0) trend = ` — you've closed the gap by ${num(closed)} pts since ${since}`
      else if (closed < 0) trend = ` — the gap has grown by ${num(-closed)} pts since ${since}`
    }
    gapLine =
      gapNow > 0 ? (
        <>
          {themName} is <span style={{ color: THEM_TEXT, fontWeight: 600 }}>+{num(gapNow)} ahead</span>
          {trend}
        </>
      ) : gapNow < 0 ? (
        <>
          You&apos;re <span style={{ color: YOU_TEXT, fontWeight: 600 }}>+{num(-gapNow)} ahead</span>
          {trend}
        </>
      ) : (
        <>Dead even{trend}</>
      )
  }

  const subtitle = (side: Side): string => {
    if (platform === 'Codeforces') {
      const s = side.cf!
      return `@${s.user.handle}${s.rating != null ? ` · ${num(s.rating)}${s.user.rankTitle ? ` ${s.user.rankTitle}` : ''}` : ''}`
    }
    if (platform === 'CodeChef') {
      const s = side.cc!
      return `@${s.user.handle}${s.globalRank != null ? ` · Rank #${num(s.globalRank)}` : ''}`
    }
    const s = side.lc!
    return `@${s.user.username}${s.user.ranking != null ? ` · Rank #${num(s.user.ranking)}` : ''}`
  }

  const timelineTitle = `${platform === 'Combined' ? 'Combined rating' : `${platform} rating`} · ${windowed ? 'last 12 months' : 'all time'}`

  return (
    <>
      {switcher}

      {/* Versus header */}
      <Card
        gradient={tokens.profileGradient}
        sx={{
          borderRadius: '24px',
          p: '28px',
          mb: '18px',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' },
          alignItems: 'center',
          gap: '24px',
        }}
      >
        <Glow color="oklch(0.62 0.14 155 / 0.14)" sx={{ top: -60, left: '15%', width: 260, height: 260 }} />
        <Glow color="oklch(0.66 0.15 285 / 0.14)" sx={{ top: -60, right: '15%', width: 260, height: 260 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
          <Avatar stats={you.lc} color="you" />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <Typography sx={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.4px' }}>
                {you.lc.user.realName ?? you.lc.user.username}
              </Typography>
              <Box sx={{ fontSize: '10.5px', fontWeight: 600, p: '3px 8px', borderRadius: '999px', color: YOU_TEXT, background: 'oklch(0.72 0.14 150 / 0.14)' }}>
                YOU
              </Box>
            </Box>
            <Typography sx={{ fontFamily: tokens.mono, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              {subtitle(you)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', position: 'relative' }}>
          <Typography sx={{ fontFamily: tokens.mono, fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '2px' }}>
            VS
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <Typography sx={{ fontFamily: tokens.mono, fontSize: 38, fontWeight: 600, color: YOU_TEXT, lineHeight: 1 }}>
              {youWins}
            </Typography>
            <Typography sx={{ fontSize: 16, color: 'rgba(255,255,255,0.3)' }}>–</Typography>
            <Typography sx={{ fontFamily: tokens.mono, fontSize: 38, fontWeight: 600, color: THEM_TEXT, lineHeight: 1 }}>
              {themWins}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.4)' }}>
            of {metrics.length} metrics won
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: { xs: 'flex-start', md: 'flex-end' }, position: 'relative' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: { xs: 'flex-start', md: 'flex-end' }, order: { xs: 2, md: 1 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <Box sx={{ fontSize: '10.5px', fontWeight: 600, p: '3px 8px', borderRadius: '999px', color: THEM_TEXT, background: 'oklch(0.7 0.14 285 / 0.14)' }}>
                RIVAL
              </Box>
              <Typography sx={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.4px' }}>
                {rival.lc.user.realName ?? rival.lc.user.username}
              </Typography>
            </Box>
            <Typography sx={{ fontFamily: tokens.mono, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              {subtitle(rival)}
            </Typography>
          </Box>
          <Box sx={{ order: { xs: 1, md: 2 } }}>
            <Avatar stats={rival.lc} color="them" />
          </Box>
        </Box>
      </Card>

      {/* Compare grid */}
      <Box
        sx={{
          display: 'grid',
          gap: '18px',
          gridTemplateColumns: { xs: '1fr', md: '1.15fr 1fr' },
          gridTemplateAreas: {
            xs: `'metrics' 'radar' 'difficulty' 'timeline'`,
            md: `'metrics radar' 'metrics difficulty' 'timeline timeline'`,
          },
        }}
      >
        {/* Head-to-head */}
        <Card area="metrics" sx={{ borderRadius: '22px', gap: '20px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px' }}>Head-to-head</Typography>
            <Box sx={{ display: 'flex', gap: '18px', fontSize: 12 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.55)' }}>
                <Box sx={{ width: 9, height: 9, borderRadius: '2px', background: YOU }} />
                You
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.55)' }}>
                <Box sx={{ width: 9, height: 9, borderRadius: '2px', background: THEM }} />
                {themName}
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '18px', flex: 1, justifyContent: 'space-between' }}>
            {metrics.map((m) => (
              <MetricRow key={m.label} m={m} />
            ))}
          </Box>
        </Card>

        {/* Radar */}
        <Card area="radar" sx={{ borderRadius: '22px', gap: '14px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Typography sx={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px' }}>Topic strengths</Typography>
            {platform !== 'LeetCode' && (
              <Box
                sx={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  p: '3px 8px',
                  borderRadius: '999px',
                  color: 'rgba(255,255,255,0.45)',
                  background: 'rgba(255,255,255,0.06)',
                }}
              >
                LeetCode topics
              </Box>
            )}
          </Box>
          {axes.length >= 3 ? (
            <>
              <Radar axes={axes} />
              {yourEdge && theirEdge && (
                <Typography sx={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
                  {yourEdge.d > 0 && theirEdge.d < 0 ? (
                    <>
                      Your edge: <span style={{ color: YOU_TEXT, fontWeight: 600 }}>{yourEdge.name}</span> · {themName}
                      &apos;s edge: <span style={{ color: THEM_TEXT, fontWeight: 600 }}>{theirEdge.name}</span>
                    </>
                  ) : yourEdge.d <= 0 && theirEdge.d < 0 ? (
                    <>
                      {themName} leads every topic — your closest gap:{' '}
                      <span style={{ color: YOU_TEXT, fontWeight: 600 }}>{yourEdge.name}</span>
                    </>
                  ) : theirEdge.d >= 0 && yourEdge.d > 0 ? (
                    <>
                      You lead every topic — {themName}&apos;s closest gap:{' '}
                      <span style={{ color: THEM_TEXT, fontWeight: 600 }}>{theirEdge.name}</span>
                    </>
                  ) : (
                    <>Dead even across topics</>
                  )}
                </Typography>
              )}
            </>
          ) : (
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', m: 'auto' }}>
              Not enough topic data yet — solve a few more tagged problems.
            </Typography>
          )}
        </Card>

        {/* Difficulty / breakdown */}
        <Card area="difficulty" sx={{ borderRadius: '22px', gap: '18px' }}>
          <Typography sx={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px' }}>{diff.title}</Typography>
          {diff.rows.length ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {diff.rows.map((r) => (
                <DiffRow key={r.label} row={r} max={diffMax} />
              ))}
            </Box>
          ) : (
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', m: 'auto' }}>
              No breakdown data yet — try a re-sync.
            </Typography>
          )}
          <Box sx={{ pt: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', mt: 'auto' }}>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              {youLead.length > 0 && themLead.length > 0 ? (
                <>
                  You lead on <span style={{ color: YOU_TEXT, fontWeight: 600 }}>{youLead.join(' + ')}</span> ·{' '}
                  {themName} leads on <span style={{ color: THEM_TEXT, fontWeight: 600 }}>{themLead.join(' + ')}</span>
                </>
              ) : youLead.length > 0 ? (
                <>
                  You lead <span style={{ color: YOU_TEXT, fontWeight: 600 }}>across the board</span>
                </>
              ) : themLead.length > 0 ? (
                <>
                  {themName} leads <span style={{ color: THEM_TEXT, fontWeight: 600 }}>across the board</span>
                </>
              ) : (
                <>Dead even</>
              )}
            </Typography>
          </Box>
        </Card>

        {/* Timeline */}
        <Card area="timeline" sx={{ borderRadius: '22px', gap: '18px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Typography sx={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px' }}>{timelineTitle}</Typography>
              {gapLine && (
                <Typography sx={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.4)' }}>{gapLine}</Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: '20px' }}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontFamily: tokens.mono, fontSize: 22, fontWeight: 600, color: YOU_TEXT }}>
                  {youRating != null ? num(youRating) : '—'}
                </Typography>
                <Typography sx={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.4)' }}>You</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontFamily: tokens.mono, fontSize: 22, fontWeight: 600, color: THEM_TEXT }}>
                  {themRating != null ? num(themRating) : '—'}
                </Typography>
                <Typography sx={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.4)' }}>{themName}</Typography>
              </Box>
            </Box>
          </Box>
          {hasTimeline ? (
            <Timeline youPts={youPts} themPts={themPts} />
          ) : (
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', m: 'auto', p: '40px 0' }}>
              Not enough contest history on both sides to draw a timeline yet.
            </Typography>
          )}
        </Card>
      </Box>
    </>
  )
}
