import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from './Card'
import { tokens } from '../theme'
import type { Stats } from '../types'

const WEEKS = 52
const fmt = (n: number) => n.toLocaleString('en-US')

const level = (count: number) => (count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4)

export default function HeatmapCard({ stats }: { stats: Stats }) {
  const { cells, months, yearRange } = useMemo(() => {
    const byDate = new Map(stats.calendar.map((d) => [d.date, d.count]))
    const today = new Date()
    const start = new Date(today)
    start.setDate(start.getDate() - (WEEKS * 7 - 1))

    const cells: { date: string; count: number }[] = []
    const cursor = new Date(start)
    for (let i = 0; i < WEEKS * 7; i++) {
      const iso = cursor.toISOString().slice(0, 10)
      cells.push({ date: iso, count: byDate.get(iso) ?? 0 })
      cursor.setDate(cursor.getDate() + 1)
    }

    const months: string[] = []
    const m = new Date(start)
    for (let i = 0; i < 12; i++) {
      months.push(m.toLocaleDateString('en-US', { month: 'short' }))
      m.setMonth(m.getMonth() + 1)
    }
    const yearRange =
      start.getFullYear() === today.getFullYear()
        ? String(today.getFullYear())
        : `${start.getFullYear()} — ${today.getFullYear()}`
    return { cells, months, yearRange }
  }, [stats.calendar])

  return (
    <Card area="heatmap" sx={{ gap: '18px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Typography sx={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px' }}>Submission activity</Typography>
          <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            <span style={{ fontFamily: tokens.mono, color: 'rgba(255,255,255,0.7)' }}>
              {fmt(stats.totals.submissionsPastYear)}
            </span>{' '}
            submissions in the past year
          </Typography>
        </Box>
        <Typography sx={{ fontFamily: tokens.mono, fontSize: '12.5px', color: 'rgba(255,255,255,0.4)' }}>
          {yearRange}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: tokens.mono,
          fontSize: 11,
          color: 'rgba(255,255,255,0.32)',
          px: '2px',
        }}
      >
        {months.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${WEEKS},1fr)`,
          gridTemplateRows: 'repeat(7,1fr)',
          gridAutoFlow: 'column',
          gap: '3px',
        }}
      >
        {cells.map((c) => (
          <Box
            key={c.date}
            title={`${c.count} submission${c.count === 1 ? '' : 's'} · ${c.date}`}
            sx={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: '2px',
              background: tokens.heatColors[level(c.count)],
            }}
          />
        ))}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: '2px' }}>
        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
          Longest active:{' '}
          <span style={{ fontFamily: tokens.mono, color: 'rgba(255,255,255,0.6)' }}>
            {stats.streak.longest} days
          </span>
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11.5px',
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          Less
          <Box sx={{ display: 'flex', gap: '3px', alignItems: 'center', mx: '3px' }}>
            {tokens.heatColors.map((c, i) => (
              <Box key={i} sx={{ width: 11, height: 11, borderRadius: '2px', background: c }} />
            ))}
          </Box>
          More
        </Box>
      </Box>
    </Card>
  )
}
