import { useCallback, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ButtonBase from '@mui/material/ButtonBase'
import CircularProgress from '@mui/material/CircularProgress'
import { tokens } from './theme'
import {
  getStats,
  syncProfile,
  getRecommendations,
  getPlatform,
  syncPlatform,
  getUpcoming,
} from './api'
import type { Stats, PlatformStats, Recommendation, UpcomingContest, Handles, Tab } from './types'
import TabBar from './components/TabBar'
import LeetCodeView from './views/LeetCodeView'
import AllPlatformsView from './views/AllPlatformsView'
import CompareView from './views/CompareView'

const HANDLES_KEY = 'leettrack-handles'
const LEGACY_KEY = 'leettrack-username'

function loadHandles(): Handles {
  try {
    const raw = localStorage.getItem(HANDLES_KEY)
    if (raw) return { lc: null, cf: null, cc: null, ...JSON.parse(raw) }
  } catch {
    // fall through to legacy/default
  }
  return { lc: localStorage.getItem(LEGACY_KEY), cf: null, cc: null }
}

function agoLabel(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function Logo() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: '9px',
          background: 'linear-gradient(150deg,oklch(0.72 0.15 150),oklch(0.55 0.14 155))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: tokens.mono,
          fontWeight: 700,
          fontSize: 16,
          color: tokens.bg,
        }}
      >
        L
      </Box>
      <Typography sx={{ fontFamily: tokens.mono, fontSize: 17, fontWeight: 600, letterSpacing: '-0.5px' }}>
        leet<span style={{ color: 'rgba(255,255,255,0.45)' }}>track</span>
      </Typography>
    </Box>
  )
}

export default function App() {
  const [handles, setHandles] = useState<Handles>(loadHandles)
  const [tab, setTab] = useState<Tab>('All platforms')
  const [lcStats, setLcStats] = useState<Stats | null>(null)
  const [cfStats, setCfStats] = useState<PlatformStats | null>(null)
  const [ccStats, setCcStats] = useState<PlatformStats | null>(null)
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingContest[]>([])
  const [busy, setBusy] = useState({ lc: false, cf: false, cc: false })
  const [recsBusy, setRecsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, tick] = useState(0)

  const saveHandles = (next: Handles) => {
    setHandles(next)
    localStorage.setItem(HANDLES_KEY, JSON.stringify(next))
  }

  const setBusyFor = (p: 'lc' | 'cf' | 'cc', v: boolean) => setBusy((b) => ({ ...b, [p]: v }))

  const syncOne = useCallback((p: 'lc' | 'cf' | 'cc', handle: string) => {
    setBusyFor(p, true)
    setError(null)
    const req =
      p === 'lc'
        ? syncProfile(handle).then((s) => {
            setLcStats(s)
            return s.user.username
          })
        : syncPlatform(p, handle).then((s) => {
            if (p === 'cf') setCfStats(s)
            else setCcStats(s)
            return s.user.handle
          })
    req
      .then((canonical) => {
        setHandles((prev) => {
          const next = { ...prev, [p]: canonical }
          localStorage.setItem(HANDLES_KEY, JSON.stringify(next))
          return next
        })
      })
      .catch((e: Error) => setError(`${p === 'lc' ? 'LeetCode' : p === 'cf' ? 'Codeforces' : 'CodeChef'}: ${e.message}`))
      .finally(() => setBusyFor(p, false))
  }, [])

  const syncAll = () => {
    if (handles.lc) syncOne('lc', handles.lc)
    if (handles.cf) syncOne('cf', handles.cf)
    if (handles.cc) syncOne('cc', handles.cc)
  }

  const loadRecs = useCallback(() => {
    setRecsBusy(true)
    getRecommendations()
      .then(setRecs)
      .catch(() => {})
      .finally(() => setRecsBusy(false))
  }, [])

  useEffect(() => {
    const h = loadHandles()
    if (h.lc) getStats(h.lc).then(setLcStats).catch(() => syncOne('lc', h.lc!))
    if (h.cf) getPlatform('cf', h.cf).then(setCfStats).catch(() => syncOne('cf', h.cf!))
    if (h.cc) getPlatform('cc', h.cc).then(setCcStats).catch(() => syncOne('cc', h.cc!))
    getUpcoming().then(setUpcoming).catch(() => {})
  }, [syncOne])

  useEffect(loadRecs, [loadRecs])

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const connectedCount = [lcStats, cfStats, ccStats].filter(Boolean).length
  const anyBusy = busy.lc || busy.cf || busy.cc
  const lastSync = [lcStats?.user.syncedAt, cfStats?.user.syncedAt, ccStats?.user.syncedAt]
    .filter((s): s is string => !!s)
    .sort()
    .pop()

  const disconnect = (p: 'lc' | 'cf' | 'cc') => {
    saveHandles({ ...handles, [p]: null })
    if (p === 'lc') setLcStats(null)
    if (p === 'cf') setCfStats(null)
    if (p === 'cc') setCcStats(null)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: 'radial-gradient(120% 55% at 50% -8%, rgba(70,92,140,0.22), rgba(10,11,14,0) 55%)',
        p: { xs: '24px 16px 40px', md: '38px 40px 56px' },
      }}
    >
      <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '26px', flexWrap: 'wrap', gap: '12px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Logo />
            <TabBar tab={tab} onChange={setTab} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              {connectedCount} profile{connectedCount === 1 ? '' : 's'} synced
              {lastSync ? ` · ${agoLabel(lastSync)}` : ''}
            </Typography>
            <ButtonBase
              onClick={syncAll}
              disabled={anyBusy || connectedCount === 0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: tokens.sans,
                fontSize: '13.5px',
                fontWeight: 600,
                color: tokens.bg,
                background: tokens.greenBright,
                p: '9px 16px',
                borderRadius: '10px',
                opacity: anyBusy || connectedCount === 0 ? 0.7 : 1,
                '&:hover': { background: 'oklch(0.86 0.13 150)' },
              }}
            >
              {anyBusy ? (
                <CircularProgress size={12} thickness={6} sx={{ color: tokens.bg }} />
              ) : (
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: tokens.bg, opacity: 0.7 }} />
              )}
              {anyBusy ? 'Syncing…' : 'Sync all'}
            </ButtonBase>
          </Box>
        </Box>

        {error && <Typography sx={{ mb: '16px', fontSize: 13, color: tokens.redText }}>{error}</Typography>}

        {tab === 'Compare' ? (
          <CompareView you={{ lc: lcStats, cf: cfStats, cc: ccStats }} onGoConnect={() => setTab('All platforms')} />
        ) : (
          <AllPlatformsView
            tab={tab}
            lc={lcStats}
            cf={cfStats}
            cc={ccStats}
            handles={handles}
            upcoming={upcoming}
            onConnect={syncOne}
            onDisconnect={disconnect}
            busy={busy}
            deepDive={
              tab === 'LeetCode' && lcStats ? (
                <LeetCodeView stats={lcStats} recs={recs} onRegenerate={loadRecs} recsBusy={recsBusy} />
              ) : undefined
            }
          />
        )}
      </Box>
    </Box>
  )
}
