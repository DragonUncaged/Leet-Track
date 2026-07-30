import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ButtonBase from '@mui/material/ButtonBase'
import Card, { Glow } from './Card'
import { tokens } from '../theme'
import type { Recommendation } from '../types'

const diffStyle: Record<Recommendation['diff'], { color: string; bg: string }> = {
  Easy: { color: tokens.greenBright, bg: 'oklch(0.74 0.14 150 / 0.14)' },
  Medium: { color: 'oklch(0.82 0.14 80)', bg: 'oklch(0.79 0.14 80 / 0.14)' },
  Hard: { color: tokens.redText, bg: 'oklch(0.66 0.16 25 / 0.14)' },
}

export default function AICard({
  recs,
  onRegenerate,
  busy,
}: {
  recs: Recommendation[]
  onRegenerate: () => void
  busy: boolean
}) {
  return (
    <Card area="ai" gradient={tokens.aiGradient} sx={{ gap: '16px', border: '1px solid rgba(255,255,255,0.07)' }}>
      <Glow color="oklch(0.66 0.15 285 / 0.2)" sx={{ top: -50, right: -40 }} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px', position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: tokens.violet,
              boxShadow: `0 0 10px ${tokens.violet}`,
            }}
          />
          <Typography sx={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px' }}>Recommendations</Typography>
        </Box>
        <Typography sx={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.42)' }}>
          Handpicked classics to level up
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '11px', position: 'relative' }}>
        {recs.map((r) => {
          const d = diffStyle[r.diff]
          return (
            <Box
              key={r.slug}
              component="a"
              href={`https://leetcode.com/problems/${r.slug}/`}
              target="_blank"
              rel="noreferrer"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                p: '14px',
                borderRadius: '15px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.055)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'background 0.15s',
                '&:hover': { background: 'rgba(255,255,255,0.06)' },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600 }}>{r.title}</Typography>
                <Typography
                  sx={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    p: '3px 9px',
                    borderRadius: '999px',
                    color: d.color,
                    background: d.bg,
                    flexShrink: 0,
                  }}
                >
                  {r.diff}
                </Typography>
              </Box>
              <Typography sx={{ fontFamily: tokens.mono, fontSize: '11.5px', color: 'rgba(255,255,255,0.42)' }}>
                {r.topics}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{r.reason}</Typography>
            </Box>
          )
        })}
      </Box>

      <ButtonBase
        onClick={onRegenerate}
        disabled={busy}
        sx={{
          mt: 'auto',
          fontFamily: tokens.sans,
          fontSize: '13.5px',
          fontWeight: 600,
          color: '#fff',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.09)',
          p: '12px',
          borderRadius: '13px',
          position: 'relative',
          opacity: busy ? 0.6 : 1,
          '&:hover': { background: 'rgba(255,255,255,0.09)' },
        }}
      >
        Regenerate recommendations
      </ButtonBase>
    </Card>
  )
}
