import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'


import { apiPrefix, apiRoute } from '#@/fixtures/base-app/src/api-route.js'
import { testConfig } from '#@/root.config.js'

import { validateRespOK } from './transactional.js'


describe(fileShortPath(import.meta.url), () => {

  describe('Should @Transactional decorator work', () => {
    const prefix = apiPrefix.propagationOverride

    it(apiRoute.simple, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.simple}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

    it(apiRoute.supports, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.supports}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

    it(apiRoute.supports2, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.supports2}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

  })
})

