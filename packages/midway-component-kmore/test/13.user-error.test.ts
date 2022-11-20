import assert from 'node:assert/strict'
import { relative } from 'node:path'

import { testConfig } from '@/root.config'


const filename = relative(process.cwd(), __filename).replace(/\\/ug, '/')

describe(filename, () => {

  it('Should work for tracer', async () => {
    const { httpRequest } = testConfig

    const path = '/user/error'
    const resp = await httpRequest
      .get(path)
      .expect(204)

    const ret = resp.body as object
    assert(ret)
    assert(! Object.keys(ret).length)
  })

})

