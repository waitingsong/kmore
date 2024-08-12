import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { apiBase, apiMethod } from '#@/api-test.js'
import { testConfig } from '#@/root.config.js'


describe(fileShortPath(import.meta.url), () => {

  const uid = 1

  it('Should rollback work', async () => {
    const { httpRequest } = testConfig

    const pathUpdate = `${apiBase.trx_manual}/${apiMethod.rollback}/`
    const urlUpdate = `${pathUpdate}${uid}`

    const resp = await httpRequest.get(urlUpdate)
    assert(resp.ok, resp.text)
    const ret = resp.text as 'OK'
    assert(ret === 'OK')
  })

  it('Should commit work', async () => {
    const { httpRequest } = testConfig

    const pathUpdate = `${apiBase.trx_manual}/${apiMethod.commit}/`
    const urlUpdate = `${pathUpdate}${uid}`

    const resp = await httpRequest.get(urlUpdate)
    assert(resp.ok, resp.text)
    const ret = resp.text as 'OK'
    assert(ret === 'OK')
  })

})

