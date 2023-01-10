import assert from 'node:assert/strict'
import { relative } from 'node:path'

import { apiRoute, apiPrefix } from '../fixtures/base-app/src/api-route'

import { validateRespOK } from './transacional.helper'

import { initDb } from '@/helper'
import { testConfig } from '@/root.config'


const filename = relative(process.cwd(), __filename).replace(/\\/ug, '/')

describe(filename, () => {
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

