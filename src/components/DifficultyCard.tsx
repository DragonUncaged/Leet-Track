import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from './Card'
import { tokens } from '../theme'
import type { Stats } from '../types'

const fmt = (n: number) => n.toLocaleString('en-US')

function Row({ label, color, solved, total }: { label: string; color: string; solved: number; total: number }) {
  const pct = total ? Math.min(100, (solved / total) * 100) : 0
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography sx={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: 14, fontWeight: 500 }}>
          <Box component="span" sx={{ width: 8, height: 8, borderRadius: '2px', background: color }} />
          {label}
        </Typography>
        <Typography sx={{ fontFamily: tokens.mono, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          {fmt(solved)} <span style={{ color: 'rgba(255,255,255,0.3)' }}>/ {fmt(total)}</span>
        </Typography>
      </Box>
      <Box sx={{ height: 7, borderRadius: '999px', background: tokens.track, overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${pct.toFixed(1)}%`, borderRadius: '999px', background: color }} />
      </Box>
    </Box>
  )
}

export default function DifficultyCard({ stats }: { stats: Stats }) {
  const { totals } = stats
  return (
    <Card area="difficulty" sx={{ gap: '22px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px' }}>Difficulty analysis</Typography>
        <Typography sx={{ fontFamily: tokens.mono, fontSize: '12.5px', color: 'rgba(255,255,255,0.4)' }}>
          all time
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Row label="Easy" color={tokens.green} solved={totals.easy.solved} total={totals.easy.total} />
        <Row label="Medium" color={tokens.amber} solved={totals.medium.solved} total={totals.medium.total} />
        <Row label="Hard" color={tokens.red} solved={totals.hard.solved} total={totals.hard.total} />
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pt: '18px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          mt: 'auto',
        }}
      >
        <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Acceptance rate</Typography>
        <Typography sx={{ fontFamily: tokens.mono, fontSize: 16, fontWeight: 600, color: tokens.greenBright }}>
          {totals.acceptance != null ? `${totals.acceptance}%` : '—'}
        </Typography>
      </Box>
    </Card>
  )
}
