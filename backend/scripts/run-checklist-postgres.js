// Arranca un PostgreSQL temporal local. No usa DATABASE_URL ni Supabase.
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const dir = mkdtempSync(join(tmpdir(), 'gr2-checklist-'))
const bin = process.env.POSTGRES_BIN || 'C:/Program Files/PostgreSQL/18/bin'
const port = '55439'
function run(exe, args, env) {
  const result = spawnSync(exe, args, { stdio: 'inherit', env: env || process.env, windowsHide: true })
  if (result.error || result.status !== 0) throw new Error(`Falló ${exe}`)
}
let started = false
try {
  run(join(bin, 'initdb.exe'), ['-D', dir, '-U', 'postgres', '-A', 'trust', '--encoding=UTF8', '--locale=C'])
  run(join(bin, 'pg_ctl.exe'), ['-D', dir, '-l', join(dir, 'server.log'), '-o', `-p ${port} -h 127.0.0.1`, '-w', 'start'])
  started = true
  run(join(bin, 'createdb.exe'), ['-h', '127.0.0.1', '-p', port, '-U', 'postgres', 'gr2_checklist_test'])
  run(process.execPath, ['--test', resolve(import.meta.dirname, '../test/checklist.postgres.test.js')], {
    ...process.env, CHECKLIST_TEST_DATABASE_URL: `postgresql://postgres@127.0.0.1:${port}/gr2_checklist_test`,
  })
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  if (started) run(join(bin, 'pg_ctl.exe'), ['-D', dir, '-m', 'fast', '-w', 'stop'])
  console.log('Directorio temporal de prueba (servidor detenido):', dir)
}
