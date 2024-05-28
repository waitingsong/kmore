import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { apiBase, apiMethod } from '#@/api-test.js'
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

  describe('Should decorator @Transactional work', () => {
    const path = `${apiBase.decorator}/${apiMethod.delete}`

    it(path, async () => {
      const { httpRequest } = testConfig

      const resp = await httpRequest.get(path)
      assert(! resp.ok, resp.text)
      assert(resp.text === 'test:delUserAllThrowError')
    })

  })

})

