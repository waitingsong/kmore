import { relative } from 'path'

import { kmoreFactory, Kmore } from '../src/index'

import { config, dbDict } from './test.config'
import { Db, UserDo } from './test.model'

// eslint-disable-next-line import/order
import assert = require('power-assert')


const filename = relative(process.cwd(), __filename).replace(/\\/ug, '/')

describe(filename, () => {
  let km: Kmore<Db>

  before(() => {
    km = kmoreFactory({ config, dict: dbDict })
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should insert table with dbh works', () => {
    it(dbDict.tables.tb_user, async () => {
      const { dbh, dict } = km

      const trx = await dbh.transaction()

      await dbh<UserDo>(dict.tables.tb_user)
        .transacting(trx)
        .forUpdate()
        .insert([ { name: 'user3', ctime: new Date() } ])
        .returning('uid')
        .then((uids) => {
          assert(uids && uids.length === 1, uids.toString())
          return uids[0]
        })
        .then(async (uid) => {
          const uidTxt = uid ? uid.toString() : 'n/a'

          await dbh<UserDo>(dict.tables.tb_user)
            // .transacting(trx)
            .where('uid', uid)
            .then((rows) => {
              assert(rows.length === 0, `uid: '${uidTxt}' should not exists out of the transaction`)
            })
          await dbh<UserDo>(dict.tables.tb_user)
            .transacting(trx) // !! same transaction
            .where('uid', uid)
            .then(([row]) => {
              assert(row && row.uid === uid, `uid: '${uidTxt}' should exists in the transaction`)
            })
          await dbh<UserDo>(dict.tables.tb_user)
            .transacting(trx) // !! same transaction
            .where('uid', uid)
            .del()
          await dbh<UserDo>(dict.tables.tb_user)
            .transacting(trx)
            .where('uid', uid)
            .then((rows) => {
              assert(rows.length === 0, `uid: '${uidTxt}' should be deleted in the transaction`)
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

