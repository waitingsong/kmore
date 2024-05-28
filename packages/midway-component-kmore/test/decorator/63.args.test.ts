import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { apiBase as apiPrefix, apiMethod as apiRoute } from '#@/api-test.js'
import { testConfig } from '#@/root.config.js'

import { validateRespOK } from './transactional.js'


describe(fileShortPath(import.meta.url), () => {

  describe('Should @Transactional decorator work', () => {
    const prefix = apiPrefix.args

    it(apiRoute.simple, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.simple}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

  })
})

