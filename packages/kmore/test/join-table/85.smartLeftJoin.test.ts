/* eslint-disable @typescript-eslint/no-unused-expressions */
import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { KmoreFactory } from '##/index.js'
import { config, dbDict } from '#@/test.config.js'

import { leftJoinData } from './data.js'


describe(fileShortPath(import.meta.url), () => {
  const km = KmoreFactory({ config, dict: dbDict })

  before(() => {
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should smartLeftJoin() table work', () => {
    it('tb_user left join tb_user_ext', async () => {
      const { scoped } = km.dict

      const ret = await km.refTables.tb_user()
        .smartLeftJoin(
          'tb_user_ext.uid',
          'tb_user.uid',
        )
        .select('*')
        .where(scoped.tb_user.uid, 1) // should scoped column

      assert(ret)
      const [row1] = ret
      assert(row1)
      row1.real_name
      row1.tb_user_ext_uid
      assert(row1.uid)
      assert(row1.name)
      assert(row1.age)
    })

    it('tb_user left join tb_user_ext and tb_order', async () => {
      const { scoped } = km.dict

      const ret = await km.refTables.tb_user()
        .smartLeftJoin(
          'tb_user_ext.uid',
          'tb_user.uid',
        )
        .smartLeftJoin(
          'tb_order.uid',
          'tb_user.uid',
        )
        .select('*')

      assert(ret)
      assert(ret.length === leftJoinData.length)

      for (let i = 0; i < 4; i += 1) {
        const row = ret[i]
        assert(row)
        const expectRow = leftJoinData[i]
        assert(expectRow)

        Object.entries(expectRow).forEach(([key, val]) => {
          assert(row[key] === val)
        })
      }
    })
  })

})


