import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { KmoreFactory } from '##/index.js'
import { config, dbDict } from '#@/test.config.js'


describe(fileShortPath(import.meta.url), () => {
  const km = KmoreFactory({ config, dict: dbDict })
  const tables = km.refTables
  const uid = 1

  before(() => {
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should smartJoin table work', () => {
    it('tb_user join tb_user_ext', async () => {
      const ret = await tables.ref_tb_user()
        .smartJoin(
          'tb_user_ext.uid',
          'tb_user.uid',
        )
        .where('tbUserExtUid', uid)
        .first()
      validateRet(ret)

      const ret2 = await tables.ref_tb_user()
        .smartJoin(
          'tb_user_ext.uid',
          'tb_user.uid',
        )
        .where({ uid })
        .first()
      validateRet(ret2)

      const ret3 = await tables.ref_tb_user()
        .smartJoin(
          'tb_user_ext.uid',
          'tb_user.uid',
        )
        .where('tb_user_ext_uid', uid)
        .first()
      validateRet(ret3)

      const ret4 = await tables.ref_tb_user()
        .smartJoin(
          'tb_user_ext.uid',
          'tb_user.uid',
        )
        .where(km.dict.scoped.tb_user.uid, 1)
        .first()
      validateRet(ret4)
    })

    it('tb_user join tb_user_ext and tb_order', async () => {
      const ret = await tables.ref_tb_user()
        .smartJoin(
          'tb_user_ext.uid',
          'tb_user.uid',
        )
        .smartJoin(
          'tb_order.uid',
          'tb_user.uid',
        )

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
      assert(typeof row1.tbUserAge === 'undefined')
      // @ts-expect-error
      assert(typeof row1.tbUserCtime === 'undefined')
      // @ts-expect-error
      assert(typeof row1.tbUserUid === 'undefined')

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


function validateRet(ret: unknown): void {
  assert(ret)
  // @ts-expect-error
  assert(ret.real_name)
  // @ts-expect-error
  assert(ret.tb_user_ext_uid)
  // @ts-expect-error
  assert(ret?.uid)
  // @ts-expect-error
  assert(ret?.name)
  // @ts-expect-error
  assert(ret?.age)
}

