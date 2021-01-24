import { basename } from '@waiting/shared-core'
import * as knex from 'knex'

import { kmore, Kmore } from '../src/index'

import { config } from './test.config'
import { Db, User } from './test.model'

// eslint-disable-next-line import/order
import assert = require('power-assert')


const filename = basename(__filename)

describe(filename, () => {
  let km: Kmore<Db>

  before(() => {
    km = kmore<Db>({ config })
    assert(km.tables && Object.keys(km.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should insert table with dbh works', () => {
    it('tb_user', async () => {
      const { tables: t, dbh } = km

      const trx = await dbh.transaction()

      await dbh<User>(t.tb_user)
        .transacting(trx)
        .forUpdate()
        .insert([ { name: 'user3', ctime: new Date() } ])
        .returning('uid')
        .then((uids) => {
          assert(uids && uids.length === 1, uids.toString())
          return uids[0]
        })
        .then(async (uid) => {
          await dbh<User>(t.tb_user)
            // .transacting(trx)
            .where('uid', uid)
            .then((rows) => {
              assert(rows.length === 0, `uid: '${uid}' should not exists out of the transaction`)
            })
          await dbh<User>(t.tb_user)
            .transacting(trx) // !! same transaction
            .where('uid', uid)
            .then(([row]) => {
              assert(row && row.uid === uid, `uid: '${uid}' should exists in the transaction`)
            })
          await dbh<User>(t.tb_user)
            .transacting(trx) // !! same transaction
            .where('uid', uid)
            .del()
          await dbh<User>(t.tb_user)
            .transacting(trx)
            .where('uid', uid)
            .then((rows) => {
              assert(rows.length === 0, `uid: '${uid}' should be deleted in the transaction`)
            })
        })
        .then(async () => await trx.commit())
        .catch((err: Error) => {
          void trx.rollback()
          assert(false, err.message)
        })

      return
    })
  })


})
