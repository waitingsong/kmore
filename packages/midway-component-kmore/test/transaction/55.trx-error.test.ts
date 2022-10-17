import assert from 'node:assert/strict'
import { relative } from 'node:path'

import { testConfig } from '@/root.config'
import { UserDTO } from '@/test.model'


const filename = relative(process.cwd(), __filename).replace(/\\/ug, '/')

describe(filename, () => {

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

