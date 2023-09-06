// https://mochajs.org/#global-fixtures
import assert from 'node:assert/strict'
import { join } from 'node:path'

import { initDb } from './helper.js'


export async function mochaGlobalSetup(): Promise<void> {
  await initDb()
}

export async function mochaGlobalTeardown(): Promise<void> {
  void 0
}

