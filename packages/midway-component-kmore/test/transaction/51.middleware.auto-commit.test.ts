import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { testConfig } from '#@/root.config.js'
import type { UserDTO } from '#@/test.model.js'


describe(fileShortPath(import.meta.url), () => {

  const pathGet = '/user/'
  const pathUpdate = '/middle_trx_auto_action/commit/'

  it('Should work', async () => {
    const { httpRequest } = testConfig

    const uid = 1
    const urlGet = `${pathGet}${uid}`
    const urlUpdate = `${pathUpdate}${uid}`

    const resp0 = await httpRequest
      .get(urlGet)
      .expect(200)
    const ctime0 = (resp0.body as UserDTO[])[0]?.ctime
    assert(ctime0)

    const resp1 = await httpRequest
      .get(urlUpdate)
      .expect(500)

    const resp2 = await httpRequest
      .get(urlGet)
      .expect(200)
    const ctime2 = (resp2.body as UserDTO[])[0]?.ctime
    assert(ctime2)

    const t0 = new Date(ctime0)
    const t2 = new Date(ctime2)
    assert(t0 < t2)
  })

})

