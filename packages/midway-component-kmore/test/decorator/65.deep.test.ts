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

  describe('Should @Transactional propagation work', () => {
    const prefix = apiPrefix.classDecoratorDeep

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

