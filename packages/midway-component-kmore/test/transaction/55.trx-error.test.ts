import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { testConfig } from '#@/root.config.js'


describe(fileShortPath(import.meta.url), () => {

  const uid = 1
  const pathUpdate = '/trx_error/close_early'

  it('Should rollback work', async () => {
    const { httpRequest } = testConfig

    const urlUpdate = `${pathUpdate}/rollback/${uid}`

    const resp = await httpRequest
      .get(urlUpdate)
      .expect(200)
    const ret = resp.text as 'OK'
    assert(ret === 'OK', ret)
  })

  it('Should commit work', async () => {
    const { httpRequest } = testConfig

    const urlUpdate = `${pathUpdate}/commit/${uid}`

    const resp = await httpRequest
      .get(urlUpdate)
      .expect(200)
    const ret = resp.text as 'OK'
    assert(ret === 'OK', ret)
  })
})

