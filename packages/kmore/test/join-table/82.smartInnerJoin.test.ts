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
      const uid = 1

      const ret = await km.refTables.ref_tb_user()
        .smartInnerJoin(
          'tb_user_ext.uid',
          'tb_user.uid',
        )
        .select('*')
        .where({ uid })
        // .where(km.dict.scoped.tb_user.uid, 1)
        .first()

      assert(ret)
      assert(ret.address === 'address1')
      assert(ret.age === 10)
      assert(ret.ctime)
      assert(ret.name === 'user1')
      assert(ret.real_name === 'rn1')
      assert(ret.tb_user_ext_uid === 1)
      assert(ret.uid === 1)
    })

    it('tb_user join tb_user_ext and tb_order', async () => {
      const { scoped } = km.dict

      const ret = await km.refTables.ref_tb_user()
        .smartInnerJoin(
          'tb_user_ext.uid',
          'tb_user.uid',
        )
        .smartInnerJoin(
          'tb_order.uid',
          'tb_user.uid',
        )
        .select('*')

      assert(ret)
      assert(ret.length === 2)

      const [row1, row2] = ret
      assert(row1)

      assert(row1.address === 'address1')
      assert(row1.age === 10)
      assert(row1.ctime)
      assert(row1.order_id === '1')
      assert(row1.order_name === 'order1')
      assert(row1.real_name === 'rn1')
      assert(row1.tb_order_ctime)
      assert(row1.tb_order_uid === 1)
      assert(row1.tb_user_ext_uid === 1)
      assert(row1.uid === 1)
      // @ts-expect-error
      assert(typeof row1.tb_user_age === 'undefined')
      // @ts-expect-error
      assert(typeof row1.tb_user_uid === 'undefined')
      // @ts-expect-error
      assert(typeof row1.tb_user_ctime === 'undefined')

      assert(row2)
      assert(row2.order_id === '2')
      assert(row2.order_name === 'order2')
    })
  })

})


