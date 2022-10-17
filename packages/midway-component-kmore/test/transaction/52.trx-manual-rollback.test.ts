import assert from 'node:assert/strict'
import { relative } from 'node:path'

import { testConfig } from '@/root.config'
import { UserDTO } from '@/test.model'


const filename = relative(process.cwd(), __filename).replace(/\\/ug, '/')

describe(filename, () => {

  const uid = 1

  it('Should rollback work', async () => {
    const { httpRequest } = testConfig

    const pathUpdate = '/trx_manual/rollback/'
    const urlUpdate = `${pathUpdate}${uid}`

    const resp = await httpRequest
      .get(urlUpdate)
      .expect(200)
    const ret = resp.text as 'OK'
    assert(ret === 'OK')
  })

  it('Should commit work', async () => {
    const { httpRequest } = testConfig

    const pathUpdate = '/trx_manual/commit/'
    const urlUpdate = `${pathUpdate}${uid}`

    const resp = await httpRequest
      .get(urlUpdate)
      .expect(200)
    const ret = resp.text as 'OK'
    assert(ret === 'OK')
  })

})

