import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { testConfig } from '#@/root.config.js'
import type { UserDTO } from '#@/test.model.js'


describe(fileShortPath(import.meta.url), () => {

  const path = '/user_this/'

  it('Should work 1', async () => {
    const { httpRequest } = testConfig

    const uid = 1
    const url = `${path}${uid}`

    const resp = await httpRequest.get(url)
    assert(resp.ok, resp.text)
    const ret = resp.body as UserDTO[]
    assert(Array.isArray(ret))
    assert(ret.length === 1)

    const [user] = ret
    assert(user)
    assert(user.uid === uid)
  })

})

