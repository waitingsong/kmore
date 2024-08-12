import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { apiBase, apiMethod } from '#@/api-test.js'
import { testConfig } from '#@/root.config.js'


describe(fileShortPath(import.meta.url), () => {

  const uid = 1
  const pathUpdate = `${apiBase.trx_error}/${apiMethod.close_early}`

  it('Should rollback work', async () => {
    const { httpRequest } = testConfig

    const urlUpdate = `${pathUpdate}/${apiMethod.rollback}/${uid}`

    const resp = await httpRequest.get(urlUpdate)
    assert(resp.ok, resp.text)
    const ret = resp.text as 'OK'
    assert(ret === 'OK', ret)
  })

  it('Should commit work', async () => {
    const { httpRequest } = testConfig

    const urlUpdate = `${pathUpdate}/${apiMethod.commit}/${uid}`

    const resp = await httpRequest.get(urlUpdate)
    assert(resp.ok, resp.text)
    const ret = resp.text as 'OK'
    assert(ret === 'OK', ret)
  })
})

