import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { syncUser } from './sync.ts'
import { getStats } from './stats.ts'
import { recommend } from './recommend.ts'
import { syncCodeforces } from './codeforces.ts'
import { syncCodechef } from './codechef.ts'
import { getPlatformStats } from './platformStats.ts'
import { getUpcoming } from './upcoming.ts'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Routes are platform-first so every URL reads as platform → user → action,
// e.g. GET /api/leetcode/alice, POST /api/codeforces/alice/sync
const PLATFORMS = {
  leetcode: {
    get: (handle: string) => getStats(handle),
    sync: async (handle: string) => {
      await syncUser(handle)
      return getStats(handle)
    },
  },
  codeforces: {
    get: (handle: string) => getPlatformStats('codeforces', handle),
    sync: async (handle: string) => {
      await syncCodeforces(handle)
      return getPlatformStats('codeforces', handle)
    },
  },
  codechef: {
    get: (handle: string) => getPlatformStats('codechef', handle),
    sync: async (handle: string) => {
      await syncCodechef(handle)
      return getPlatformStats('codechef', handle)
    },
  },
}

for (const [platform, impl] of Object.entries(PLATFORMS)) {
  app.get(`/api/${platform}/:handle`, async (req, res) => {
    try {
      const stats = await impl.get(req.params.handle)
      if (!stats) return res.status(404).json({ error: `${platform} handle not synced yet` })
      res.json(stats)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: (err as Error).message })
    }
  })

  app.post(`/api/${platform}/:handle/sync`, async (req, res) => {
    try {
      res.json(await impl.sync(req.params.handle))
    } catch (err) {
      console.error(err)
      const msg = (err as Error).message
      res.status(msg.includes('not found') ? 404 : 500).json({ error: msg })
    }
  })
}

app.get('/api/recommendations', (_req, res) => {
  res.json(recommend(3))
})

app.get('/api/contests/upcoming', async (_req, res) => {
  try {
    res.json(await getUpcoming())
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: (err as Error).message })
  }
})

const port = Number(process.env.PORT) || 3001
app.listen(port, () => console.log(`API listening on http://localhost:${port}`))
