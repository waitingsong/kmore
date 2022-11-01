import assert from 'node:assert/strict'
import { relative } from 'node:path'

import { UserDTO, UserExtDTO } from './test.model'

import { testConfig } from '@/root.config'


const filename = relative(process.cwd(), __filename).replace(/\\/ug, '/')

describe(filename, () => {

  it('Should work', async () => {
    const { httpRequest } = testConfig

    const path = '/user/paging'
    const resp = await httpRequest
      .get(path)
      .expect(200)

    const ret = resp.body as UserDTO[]
    assert(Array.isArray(ret))
    assert(ret.length)
  })

  it('Should work with transaction', async () => {
    const { httpRequest } = testConfig

    const path = '/user/paging_trx'
    const resp = await httpRequest
      .get(path)
      .expect(200)

    const ret = resp.body as UserDTO[]
    assert(Array.isArray(ret))
    assert(ret.length)
  })

})

