import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import type { Kmore } from '##/index.js'
import { KmoreFactory } from '##/index.js'
import { postProcessResponse } from '##/lib/helper.js'
import { config, dbDict } from '#@/test.config.js'
import type { Db } from '#@/test.model.js'


describe(fileShortPath(import.meta.url), () => {
  let km: Kmore<Db>

  const configWithPostCb = {
    ...config,
    postProcessResponse,
  }

  before(() => {
    km = KmoreFactory({ config: configWithPostCb, dict: dbDict })
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
    assert(km.postProcessResponseSet.size === 1)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should work', () => {
    it('tb_user', async () => {
      const { tb_user } = km.refTables

      const ret = await tb_user().select('*')
      assert(ret)
      ret.forEach((row) => {
        // @ts-ignore
        assert(typeof row.foo === 'undefined')
      })
    })
  })

})
