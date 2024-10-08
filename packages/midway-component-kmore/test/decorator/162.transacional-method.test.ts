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


  describe('Should transactional propagation work update/delete', () => {
    const prefix = apiPrefix.methodDecorator

    it(apiRoute.updateDel, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.updateDel}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

    it(apiRoute.updateDel, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.updateDel}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

    it(apiRoute.updateDelOneByOne, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.updateDelOneByOne}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

    it(apiRoute.controllerUpdateDelOneByOne, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.controllerUpdateDelOneByOne}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

    it(apiRoute.updateDelAll, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.updateDelAll}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

    it(apiRoute.selfUpdateDel, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.selfUpdateDel}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

    it(apiRoute.selfReturnMissingAwait, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.selfReturnMissingAwait}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

    // see next case
    it(apiRoute.selfReturnPromise, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.selfReturnPromise}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

    // test again, and after selfReturnPromise to test TrxStatusService.errorMsgIndex works well
    it(apiRoute.updateDelOneByOne, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.updateDelOneByOne}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

    it(apiRoute.throwError, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.throwError}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

    it(apiRoute.returnReject, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.returnReject}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })
  })
})

