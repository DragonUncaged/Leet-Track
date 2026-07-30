import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { pool } from './db.ts'

const here = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(here, 'schema.sql'), 'utf8')

const client = await pool.connect()
try {
  await client.query(sql)
  console.log('Migration applied.')
} finally {
  client.release()
  await pool.end()
}
