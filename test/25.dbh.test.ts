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
  })

  after(async () => {
    await db.dbh.destroy() // !
  })

  describe('Should insert table with db.dbh works', () => {
    it(db.tables.tb_user, async () => {
      const { tables } = db

      await db.dbh<User>(tables.tb_user)
        .insert([ { name: 'user3', ctime: new Date() } ])
        .returning('uid')
        .then((uids) => {
          assert(uids && uids.length === 1, uids.toString())
          return uids[0]
        })
        .then(uid => db.dbh<User>(tables.tb_user)
          .where('uid', uid)
          .del())
        .catch((err: Error) => {
          assert(false, err.message)
        })

      return
    })
  })


})
