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

  describe('Should ignore @Cacheable combined with @Transactional', () => {
    const prefix = apiPrefix.cache

    it(apiRoute.get, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.get}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

    it(apiRoute.delete, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.delete}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

    // it(apiRoute.controllerUpdate, async () => {
    //   const { httpRequest } = testConfig
    //   const url = `${prefix}/${apiRoute.controllerUpdate}`

    //   const resp = await httpRequest
    //     .get(url)
    //     .expect(200)

    //   validateRespOK(resp)
    // })
  })

})

