import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { kmore, DbModel } from '../src/index'

import { config } from './test.config'
import { TbListModel, User } from './test.model'


const filename = basename(__filename)

describe(filename, () => {
  let db: DbModel<TbListModel>

  before(() => {
    db = kmore<TbListModel>(config)
    assert(db.tables && Object.keys(db.tables).length > 0)
  })

  after(async () => {
    await db.dbh.destroy() // !
  })

  describe('Should insert table with db.dbh works', () => {
    it('tb_user', async () => {
      const { tables: t } = db

      await db.dbh<User>(t.tb_user)
        .insert([ { name: 'user3', ctime: new Date() } ])
        .returning('uid')
        .then((uids) => {
          assert(uids && uids.length === 1, uids.toString())
          return uids[0]
        })
        .then(uid => db.dbh<User>(t.tb_user)
          .where('uid', uid)
          .del())
        .catch((err: Error) => {
          assert(false, err.message)
        })

      return
    })
  })


})
