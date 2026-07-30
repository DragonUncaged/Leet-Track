import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import { tokens } from '../theme'
import type { Tab } from '../types'

const TABS: Tab[] = ['All platforms', 'LeetCode', 'Codeforces', 'CodeChef', 'Compare']

export default function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: '4px',
        ml: '20px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '11px',
        p: '4px',
      }}
    >
      {TABS.map((t) => {
        const active = t === tab
        return (
          <ButtonBase
            key={t}
            onClick={() => onChange(t)}
            sx={{
              fontFamily: tokens.sans,
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              color: active ? '#fff' : 'rgba(255,255,255,0.5)',
              background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
              p: '7px 14px',
              borderRadius: '8px',
              transition: 'all .18s',
              '&:hover': { color: '#fff' },
            }}
          >
            {t}
          </ButtonBase>
        )
      })}
    </Box>
  )
}
