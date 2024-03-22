import { fileShortPath } from '@waiting/shared-core'


import { apiPrefix, apiRoute } from '#@/fixtures/base-app/src/api-route.js'
import { initDb } from '#@/helper.js'
import { testConfig } from '#@/root.config.js'

import { validateRespOK } from './transacional.helper.js'


describe(fileShortPath(import.meta.url), () => {
  beforeEach(async () => {
    await initDb()
  })
  after(async () => {
    await initDb()
  })

  describe('Should ignore @Cacheable combined with @Transactional', () => {
    const prefix = apiPrefix.cache

    it(apiRoute.cacheableWithClassTransactional, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.cacheableWithClassTransactional}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRespOK(resp)
    })

  })

})

