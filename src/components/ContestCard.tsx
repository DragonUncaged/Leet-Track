import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from './Card'
import { tokens } from '../theme'
import type { Stats } from '../types'

const fmt = (n: number) => n.toLocaleString('en-US')

function Chart({ ratings }: { ratings: number[] }) {
  const W = 560
  const H = 150
  const pad = 10
  const min = Math.min(...ratings) - 50
  const max = Math.max(...ratings) + 50
  const pts = ratings.map((r, i) => {
    const x = ratings.length === 1 ? W / 2 : pad + (i / (ratings.length - 1)) * (W - 2 * pad)
    const y = pad + (1 - (r - min) / (max - min)) * (H - 2 * pad)
    return [x, y] as const
  })
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L ${(W - pad).toFixed(1)} ${H - pad} L ${pad} ${H - pad} Z`
  const last = pts[pts.length - 1]
  const stroke = 'oklch(0.74 0.15 150)'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 150, display: 'block' }}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#cg)" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="9" fill={stroke} fillOpacity="0.2" />
      <circle cx={last[0]} cy={last[1]} r="4.5" fill={stroke} />
    </svg>
  )
}

export default function ContestCard({ stats }: { stats: Stats }) {
  const c = stats.contest
  return (
    <Card area="contest" sx={{ gap: '18px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Typography sx={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px' }}>Contest history</Typography>
          {c && (
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '10px', mt: '4px' }}>
              <Typography sx={{ fontFamily: tokens.mono, fontSize: 34, fontWeight: 600, lineHeight: 1, letterSpacing: '-1px' }}>
                {fmt(c.rating)}
              </Typography>
              {c.delta != null && (
                <Typography sx={{ fontSize: 13, color: c.delta >= 0 ? tokens.greenBright : tokens.redText }}>
                  {c.delta >= 0 ? `▲ +${c.delta}` : `▼ ${c.delta}`}
                </Typography>
              )}
            </Box>
          )}
        </Box>
        {c && (
          <Box sx={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
            <Typography sx={{ fontFamily: tokens.mono, fontSize: '12.5px', color: 'rgba(255,255,255,0.4)' }}>
              peak {fmt(c.peak)}
            </Typography>
            {c.topPercentage != null && (
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  p: '4px 10px',
                  borderRadius: '999px',
                  color: tokens.greenBright,
                  background: tokens.greenPillBg,
                }}
              >
                Top {c.topPercentage}%
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {c ? (
        <>
          <Chart ratings={c.history.map((h) => h.rating)} />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12.5px',
              color: 'rgba(255,255,255,0.4)',
              pt: '14px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span>{c.attended} contests attended</span>
            {c.lastContest && (
              <span style={{ fontFamily: tokens.mono }}>
                {c.lastContest.title}
                {c.lastContest.rank != null ? ` · Rank ${fmt(c.lastContest.rank)}` : ''}
              </span>
            )}
          </Box>
        </>
      ) : (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 150,
            color: 'rgba(255,255,255,0.35)',
            fontSize: 13.5,
          }}
        >
          No contests attended yet
        </Box>
      )}
    </Card>
  )
}
