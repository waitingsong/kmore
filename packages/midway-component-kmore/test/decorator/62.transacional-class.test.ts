import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { apiPrefix, apiRoute } from '#@/fixtures/base-app/src/api-route.js'
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

  describe('Should @Transactional propagation work select/update', () => {
    const prefix = apiPrefix.classDecorator

    it(apiRoute.separateTrx, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.separateTrx}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

    it(apiRoute.sibling, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.sibling}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

    it(apiRoute.update, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.update}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })

    it(apiRoute.controllerUpdate, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.controllerUpdate}`

      const resp = await httpRequest.get(url)
      assert(resp.ok, resp.text)
      validateRespOK(resp)
    })
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

    it(apiRoute.selfReturnPromise, async () => {
      const { httpRequest } = testConfig
      const url = `${prefix}/${apiRoute.selfReturnPromise}`

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

