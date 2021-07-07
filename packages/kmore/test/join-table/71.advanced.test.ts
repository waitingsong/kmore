import { basename } from '@waiting/shared-core'
import { DbDictType } from 'kmore-types'

import { kmoreFactory } from '../../src/index'
import { config, dbDict } from '../test.config'

// eslint-disable-next-line import/order
import assert = require('power-assert')


const filename = basename(__filename)

describe(filename, () => {
  const km = kmoreFactory({ config, dict: dbDict })
  type Db = typeof km.DbModel
  type UserDo = Db['tb_user']
  type UserExtDo = Db['tb_user_ext']
  type CT = DbDictType<Db>
  type CT_USER = CT['tb_user']
  type CT_USER_EXT = CT['tb_user_ext']

  before(() => {
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should inner join table works', () => {
    it('pre-build name by alias', async () => {
      const { refTables } = km
      const { tables, scoped, alias } = km.dict

      const cols = [
        alias.tb_user.uid, // { tbUser: 'tb_user.uid' }
        alias.tb_user_ext.uid, // { tbUserExt: 'tb_user_ext.uid' }
      ]

      const ret = await refTables.ref_tb_user()
        .innerJoin<CT['tb_user'] & CT['tb_user_ext']>(
        tables.tb_user_ext,
        scoped.tb_user.uid,
        scoped.tb_user_ext.uid,
      )
        .columns(cols)
        .then(rows => rows[0])

      assert(ret && Object.keys(ret).length === 2)
      assert(ret && typeof ret.tbUserUid === 'number')
      assert(ret && typeof ret.tbUserExtUid === 'number')
      assert(ret && ret.tbUserUid === ret.tbUserExtUid)
    })

    it('custom name by scoped', async () => {
      const { refTables } = km
      const { tables, scoped } = km.dict

      const cols = {
        uid: scoped.tb_user.uid,
        foo: scoped.tb_user_ext.uid,
      }

      const ret = await refTables.ref_tb_user()
        .innerJoin<CT['tb_user'] & CT['tb_user_ext']>(
        tables.tb_user_ext,
        scoped.tb_user.uid,
        scoped.tb_user_ext.uid,
      )
        .select('name')
        .columns(cols)
        .then(rows => rows[0])

      assert(ret && Object.keys(ret).length === 3)
      assert(ret && typeof ret.name === 'string')
      assert(ret && typeof ret.uid === 'number')
      assert(ret && typeof ret.foo === 'number')
      assert(ret && ret.foo === ret.uid)
    })
  })

})

