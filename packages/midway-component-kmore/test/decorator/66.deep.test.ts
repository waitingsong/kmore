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

  describe('Should @Transactional propagation work', () => {
    const prefix = apiPrefix.classDecoratorDeep2

    it(apiRoute.seperateTrx, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.seperateTrx}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRespOK(resp)
    })

    it(apiRoute.sibling, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.sibling}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRespOK(resp)
    })

    it(apiRoute.update, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.update}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRespOK(resp)
    })

    it(apiRoute.controllerUpdate, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.controllerUpdate}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRespOK(resp)
    })
  })

})

