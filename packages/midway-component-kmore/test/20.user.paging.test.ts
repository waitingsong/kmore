import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { testConfig } from '#@/root.config.js'
import { UserDTO } from '#@/test.model.js'


describe(fileShortPath(import.meta.url), () => {

  it('Should work', async () => {
    const { httpRequest } = testConfig

    const path = '/user/paging'
    const resp = await httpRequest.get(path)
    assert(resp.ok, resp.text)
    const ret = resp.body as UserDTO[]
    assert(Array.isArray(ret))
    assert(ret.length)
  })

  it('Should work with transaction', async () => {
    const { httpRequest } = testConfig

    const path = '/user/paging_trx'
    const resp = await httpRequest.get(path)
    assert(resp.ok, resp.text)
    const ret = resp.body as UserDTO[]
    assert(Array.isArray(ret))
    assert(ret.length)
  })

})

