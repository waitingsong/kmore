import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { apiBase as apiPrefix, apiMethod as apiRoute } from '#@/api-test.js'
import { initDb } from '#@/helper.js'
import { testConfig } from '#@/root.config.js'

import { validateRespOK } from './transactional.js'


describe(fileShortPath(import.meta.url), () => {

  beforeEach(async () => {
    await initDb()
  })
  after(async () => {
    await initDb()
  })

  describe('Should transactional propagation work update/delete', () => {
    const prefix = apiPrefix.methodDecorator

    it(apiRoute.selfReturnMissingAwait, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.fast_self_return_missing_await}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

  })
})

