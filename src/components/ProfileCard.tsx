import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card, { Glow } from './Card'
import { tokens } from '../theme'
import type { Stats } from '../types'

const fmt = (n: number) => n.toLocaleString('en-US')

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <Box
      sx={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '14px',
        p: '14px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <Typography sx={{ fontFamily: tokens.mono, fontSize: 20, fontWeight: 600 }}>{value}</Typography>
      <Typography sx={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.4)' }}>{label}</Typography>
    </Box>
  )
}

export default function ProfileCard({ stats }: { stats: Stats }) {
  const { user, totals } = stats
  const pct = totals.totalQuestions ? (totals.solved / totals.totalQuestions) * 100 : 0
  const initial = (user.realName || user.username).charAt(0).toUpperCase()

  return (
    <Card area="profile" gradient={tokens.profileGradient} sx={{ p: '28px', gap: '24px' }}>
      <Glow color="oklch(0.6 0.14 155 / 0.16)" sx={{ top: -40, right: -30, width: 220, height: 220 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: '16px',
            background: 'linear-gradient(150deg,#2a2e37,#161920)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: tokens.mono,
            fontSize: 22,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.85)',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {user.avatar ? (
            <img src={user.avatar} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            initial
          )}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <Typography sx={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.4px' }}>
            {user.realName || user.username}
          </Typography>
          <Typography sx={{ fontFamily: tokens.mono, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            @{user.username}
            {user.badge ? ` · ${user.badge}` : user.country ? ` · ${user.country}` : ''}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '16px', position: 'relative' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <Typography sx={{ fontFamily: tokens.mono, fontSize: 52, fontWeight: 600, lineHeight: 1, letterSpacing: '-2px' }}>
            {fmt(totals.solved)}
          </Typography>
          <Typography sx={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.45)' }}>problems solved</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', pb: '6px' }}>
          {user.ranking != null && (
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 600,
                p: '4px 11px',
                borderRadius: '999px',
                color: tokens.greenBright,
                background: tokens.greenPillBg,
                width: 'fit-content',
              }}
            >
              Global rank #{fmt(user.ranking)}
            </Typography>
          )}
          {stats.contest?.topPercentage != null && (
            <Typography sx={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.4)' }}>
              Top {stats.contest.topPercentage}% in contests
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'rgba(255,255,255,0.4)' }}>
          <span>Overall completion</span>
          <span style={{ fontFamily: tokens.mono }}>
            {fmt(totals.solved)} / {fmt(totals.totalQuestions)}
          </span>
        </Box>
        <Box sx={{ height: 8, borderRadius: '999px', background: tokens.track, overflow: 'hidden' }}>
          <Box
            sx={{
              height: '100%',
              width: `${pct.toFixed(1)}%`,
              borderRadius: '999px',
              background: 'linear-gradient(90deg,oklch(0.62 0.13 155),oklch(0.82 0.14 150))',
            }}
          />
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', mt: 'auto' }}>
        <MiniStat value={fmt(totals.submissionsPastYear)} label="Submissions / yr" />
        <MiniStat value={fmt(user.badgesCount)} label="Badges" />
        <MiniStat value={fmt(user.reputation ?? 0)} label="Reputation" />
      </Box>
    </Card>
  )
}
