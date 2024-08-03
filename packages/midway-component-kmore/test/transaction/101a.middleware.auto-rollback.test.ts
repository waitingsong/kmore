import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { apiBase, apiMethod } from '#@/api-test.js'
import { testConfig } from '#@/root.config.js'
import type { UserDTO } from '#@/test.model.js'


describe(fileShortPath(import.meta.url), () => {

  const pathGet = `${apiBase.user}/`
  const pathUpdate = `${apiBase.middle_trx_auto_action}/${apiMethod.rollback}/`

  it('Should work', async () => {
    const { httpRequest } = testConfig

    const uid = 1
    const urlUpdate = `${pathUpdate}${uid}`

    await httpRequest
      .get(urlUpdate)
      .expect(500)
  })

  it('Should work mixed', async () => {
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

    const resp2 = await httpRequest
      .get(urlGet)
      .expect(200)
    const ctime2 = (resp2.body as UserDTO[])[0]?.ctime
    assert(ctime2)

    assert(ctime0.toLocaleString() === ctime2.toLocaleString())
  })

})

