import assert from 'node:assert/strict'
import { relative } from 'node:path'

import { apiRoute, apiPrefix } from '../fixtures/base-app/src/api-route'

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

  describe('Should @Transactional propagation work select/update', () => {
    const prefix = apiPrefix.methodDecorator

    it(apiRoute.seperateTrx, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.seperateTrx}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRet(resp)
    })

    it(apiRoute.sibling, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.sibling}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRet(resp)
    })

    it(apiRoute.update, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.update}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRet(resp)
    })

    it(apiRoute.controllerUpdate, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.controllerUpdate}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRet(resp)
    })
  })


  describe('Should transactional propagation work update/delete', () => {
    const prefix = apiPrefix.methodDecorator

    it(apiRoute.updateDel, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.updateDel}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRet(resp)
    })

    it(apiRoute.updateDelOneByOne, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.updateDelOneByOne}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRet(resp)
    })

    it(apiRoute.controllerUpdateDelOneByOne, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.controllerUpdateDelOneByOne}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRet(resp)
    })

    it(apiRoute.updateDelAll, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.updateDelAll}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRet(resp)
    })

    it(apiRoute.selfUpdateDel, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.selfUpdateDel}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRet(resp)
    })

    it(apiRoute.selfReturnMissingAwait, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.selfReturnMissingAwait}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRet(resp)
    })

    it(apiRoute.selfReturnPromise, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.selfReturnPromise}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRet(resp)
    })

    it(apiRoute.throwError, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.throwError}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRet(resp)
    })

    it(apiRoute.returnReject, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.returnReject}`

      const resp = await httpRequest
        .get(url)
        .expect(200)

      validateRet(resp)
    })
  })
})


function validateRet(resp: any): void {
  assert(resp)
  assert(typeof resp.text === 'string')
  assert(resp.text === 'OK')
}
