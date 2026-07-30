import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card, { Glow } from './Card'
import { tokens } from '../theme'
import type { Stats } from '../types'

export function StreakCard({ stats }: { stats: Stats }) {
  return (
    <Card area="streak" sx={{ p: '24px', justifyContent: 'space-between', gap: '14px' }}>
      <Glow color="oklch(0.75 0.15 55 / 0.16)" sx={{ bottom: -30, left: -10, width: 130, height: 130 }} />
      <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', position: 'relative' }}>
        Current streak
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '8px', position: 'relative' }}>
        <Typography sx={{ fontFamily: tokens.mono, fontSize: 42, fontWeight: 600, lineHeight: 1, letterSpacing: '-1.5px' }}>
          {stats.streak.current}
        </Typography>
        <Typography sx={{ fontSize: 15, color: 'rgba(255,255,255,0.5)' }}>days</Typography>
      </Box>
      <Typography sx={{ fontFamily: tokens.mono, fontSize: '12.5px', color: tokens.orange, position: 'relative' }}>
        Best · {stats.streak.longest} days
      </Typography>
    </Card>
  )
}

export function WeeklyCard({ stats }: { stats: Stats }) {
  const { thisWeek, lastWeek } = stats.weekly
  const delta = thisWeek - lastWeek
  return (
    <Card area="solved" sx={{ p: '24px', justifyContent: 'space-between', gap: '14px' }}>
      <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Submissions this week</Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <Typography sx={{ fontFamily: tokens.mono, fontSize: 42, fontWeight: 600, lineHeight: 1, letterSpacing: '-1.5px' }}>
          {thisWeek}
        </Typography>
        <Typography sx={{ fontSize: 13, color: delta >= 0 ? tokens.greenBright : tokens.redText }}>
          {delta >= 0 ? `▲ +${delta}` : `▼ ${delta}`}
        </Typography>
      </Box>
      <Typography sx={{ fontFamily: tokens.mono, fontSize: '12.5px', color: 'rgba(255,255,255,0.4)' }}>
        vs. {lastWeek} last week
      </Typography>
    </Card>
  )
}
