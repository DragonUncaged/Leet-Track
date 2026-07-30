import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from './Card'
import { tokens } from '../theme'
import type { Stats } from '../types'

export default function LanguagesCard({ stats }: { stats: Stats }) {
  const langs = stats.languages.slice(0, 4)
  const totalSolved = stats.totals.solved || 1
  return (
    <Card area="languages" sx={{ gap: '20px' }}>
      <Typography sx={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px' }}>Languages</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {langs.length === 0 && (
          <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>No language data yet</Typography>
        )}
        {langs.map((l) => (
          <Box key={l.name} sx={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'rgba(255,255,255,0.75)' }}>{l.name}</span>
              <span style={{ fontFamily: tokens.mono, color: 'rgba(255,255,255,0.45)' }}>{l.solved}</span>
            </Box>
            <Box sx={{ height: 6, borderRadius: '999px', background: tokens.track, overflow: 'hidden' }}>
              <Box
                sx={{
                  height: '100%',
                  width: `${Math.min(100, (l.solved / totalSolved) * 100).toFixed(1)}%`,
                  borderRadius: '999px',
                  background: tokens.blue,
                }}
              />
            </Box>
          </Box>
        ))}
      </Box>
    </Card>
  )
}
