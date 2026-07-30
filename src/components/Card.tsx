import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { tokens } from '../theme'

interface CardProps {
  area?: string
  gradient?: string
  sx?: SxProps<Theme>
  children: ReactNode
}

export default function Card({ area, gradient, sx, children }: CardProps) {
  return (
    <Box
      sx={{
        gridArea: area,
        background: gradient ?? tokens.cardGradient,
        border: tokens.cardBorder,
        borderRadius: '24px',
        boxShadow: tokens.cardShadow,
        p: '26px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}

export function Glow({ sx, color }: { sx?: SxProps<Theme>; color: string }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}, transparent 65%)`,
        pointerEvents: 'none',
        ...sx,
      }}
    />
  )
}
