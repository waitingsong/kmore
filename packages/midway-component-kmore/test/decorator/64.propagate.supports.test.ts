import assert from 'node:assert/strict'
import { relative } from 'node:path'

import { validateRespOK } from './transacional.helper'

import { apiPrefix, apiRoute } from '@/fixtures/base-app/src/api-route'
import { testConfig } from '@/root.config'


const filename = relative(process.cwd(), __filename).replace(/\\/ug, '/')

describe(filename, () => {
  describe('Should @Transactional decorator work', () => {
    const prefix = apiPrefix.propagationOverride

    it(apiRoute.simple, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.simple}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRespOK(resp)
    })

    it(apiRoute.supports, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.supports}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRespOK(resp)
    })

    it(apiRoute.supports2, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.supports2}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRespOK(resp)
    })

  })
})

