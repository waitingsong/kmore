import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { testConfig } from '#@/root.config.js'


describe(fileShortPath(import.meta.url), () => {

  it('Should work for tracer', async () => {
    const { httpRequest } = testConfig

    const path = '/user/error'
    const resp = await httpRequest
      .get(path)
      .expect(500)

    const ret = resp.body as object
    assert(ret)
    assert(! Object.keys(ret).length)
  })

})

