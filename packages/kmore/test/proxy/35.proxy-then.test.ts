import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { KmoreFactory, KmoreProxyKey } from '##/index.js'
import { config, dbDict } from '#@/test.config.js'


describe(fileShortPath(import.meta.url), () => {
  const km = KmoreFactory({ config, dict: dbDict })

  before(() => {
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should proxy then() work', () => {
    it('normal', async () => {
      const uid = 1

      const ret = await km.refTables.tb_user()
        .where('uid', uid)
        .select('*')
        .then((rows) => {
          assert(Object.hasOwn(rows, KmoreProxyKey.getThenProxyProcessed), JSON.stringify(rows))
          return rows
        })

      assert(ret)
      assert(ret.length > 0)
      assert(Object.hasOwn(ret, KmoreProxyKey.getThenProxyProcessed))
    })

    it('smartJoin', async () => {
      const uid = 1

      const ret = await km.refTables.tb_user()
        .smartJoin(
          'tb_user_ext.uid',
          'tb_user.uid',
        )
        .where('tb_user_ext_uid', uid)
        .select('*')
        .then((rows) => {
          assert(Object.hasOwn(rows, KmoreProxyKey.getThenProxyProcessed), JSON.stringify(rows))
          return rows
        })

      assert(ret)
      assert(ret.length > 0)
      assert(Object.hasOwn(ret, KmoreProxyKey.getThenProxyProcessed))
    })
  })

})


