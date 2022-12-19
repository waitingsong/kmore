import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { KmoreFactory } from '../../src/index.js'
import { config, dbDict } from '../test.config.js'


describe(fileShortPath(import.meta.url), () => {
  const km = KmoreFactory({ config, dict: dbDict })

  before(() => {
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should smartInnerJoin table work', () => {
    it('tb_user join tb_user_ext', async () => {
      const { dict } = km
      const uid = 1

      const builder = km.refTables.ref_tb_user()
        .smartInnerJoin(
          'tb_user_ext.uid',
          'tb_user.uid',
        )
        .clearSelect()
        .columns({
          addr: dict.scoped.tb_user_ext.address,
          age2: dict.scoped.tb_user_ext.age,
          realNameAlias: dict.columns.tb_user.real_name,
          ctime: dict.scoped.tb_user.ctime,
          foo: dict.scoped.tb_user.uid,
          bar: dict.scoped.tb_user_ext.uid,
          name: dict.columns.tb_user.name,
        })
        .where({ uid })

      const sql = builder.toQuery(); void sql
      const ret = await builder
        .first()


      assert(ret)
      assert(ret.addr === 'address1')
      assert(ret.age2 === 10)
      assert(ret.ctime)
      assert(ret.name === 'user1')
      assert(ret.realNameAlias === 'rn1')
      assert(ret.bar === 1)
      assert(ret.foo === 1)
    })

  })

})


