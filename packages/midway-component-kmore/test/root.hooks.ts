import assert from 'node:assert/strict'
import 'tsconfig-paths/register'
import { join } from 'node:path'

import * as WEB from '@midwayjs/koa'
import { createApp, close, createHttpRequest } from '@midwayjs/mock'
import type { Application } from '@mwcp/share'

import { initDb } from './helper'

import { kmoreConfig, mwConfig } from '@/config.unittest'
import { testConfig } from '@/root.config'
import { ConfigKey } from '~/index'


/**
 * @see https://mochajs.org/#root-hook-plugins
 * beforeAll:
 *  - In serial mode(Mocha’s default ), before all tests begin, once only
 *  - In parallel mode, run before all tests begin, for each file
 * beforeEach:
 *  - In both modes, run before each test
 */
export const mochaHooks = async () => {
  // avoid run multi times
  if (! process.env['mochaRootHookFlag']) {
    process.env['mochaRootHookFlag'] = 'true'
    await initDb()
  }

  return {
    beforeAll: async () => {
      const globalConfig = {
        keys: Math.random().toString(),
        [ConfigKey.middlewareConfig]: mwConfig,
        [ConfigKey.config]: kmoreConfig,
      }
      const opts = {
        imports: [WEB],
        globalConfig,
      }
      const app = await createApp(join(__dirname, 'fixtures', 'base-app'), opts) as Application
      app.addConfigObject(globalConfig)
      testConfig.app = app
      testConfig.httpRequest = createHttpRequest(app)
      const { url } = testConfig.httpRequest.get('/')
      testConfig.host = url

      testConfig.container = app.getApplicationContext()
      // const svc = await testConfig.container.getAsync(TaskQueueService)
      // https://midwayjs.org/docs/testing
    },

    beforeEach: async () => {
      return
    },

    afterEach: async () => {
      const { app } = testConfig
      app.addConfigObject({
        [ConfigKey.middlewareConfig]: mwConfig,
      })
    },

    afterAll: async () => {
      if (testConfig.app) {
        await close(testConfig.app)
      }
    },
  }

}

