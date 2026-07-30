import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { Stats, Recommendation } from '../types'
import DifficultyCard from '../components/DifficultyCard'
import HeatmapCard from '../components/HeatmapCard'
import AICard from '../components/AICard'
import ContestCard from '../components/ContestCard'
import LanguagesCard from '../components/LanguagesCard'

export default function LeetCodeView({
  stats,
  recs,
  onRegenerate,
  recsBusy,
}: {
  stats: Stats
  recs: Recommendation[]
  onRegenerate: () => void
  recsBusy: boolean
}) {
  return (
    <>
      <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', m: '6px 2px 12px' }}>
        LeetCode deep dive
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: '18px',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' },
          gridTemplateAreas: {
            xs: `'heatmap' 'difficulty' 'ai' 'languages' 'contest'`,
            sm: `'heatmap heatmap' 'difficulty difficulty' 'ai languages' 'contest contest'`,
            lg: `'heatmap heatmap heatmap ai'
                 'difficulty difficulty languages ai'
                 'contest contest contest contest'`,
          },
        }}
      >
        <HeatmapCard stats={stats} />
        <AICard recs={recs} onRegenerate={onRegenerate} busy={recsBusy} />
        <DifficultyCard stats={stats} />
        <LanguagesCard stats={stats} />
        <ContestCard stats={stats} />
      </Box>
    </>
  )
}
