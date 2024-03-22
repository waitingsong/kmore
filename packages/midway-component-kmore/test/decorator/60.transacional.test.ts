import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { apiPrefix, apiRoute } from '#@/fixtures/base-app/src/api-route.js'
import { testConfig } from '#@/root.config.js'


describe(fileShortPath(import.meta.url), () => {
  describe('Should @Transactional decorator work', () => {
    const prefix = apiPrefix.methodDecorator

    it(apiRoute.simple, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.simple}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      assert(resp)
      const data = resp.text
      assert(data === 'OK')
    })

  })
})

