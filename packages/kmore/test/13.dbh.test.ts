import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { KmoreFactory, Kmore } from '../src/index.js'

import { config, dbDict } from './test.config.js'
import { Db, UserDo } from './test.model.js'


describe(fileShortPath(import.meta.url), () => {
  let km: Kmore<Db>

  before(() => {
    km = KmoreFactory({ config, dict: dbDict })
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should insert table with dbh work', () => {
    it(dbDict.tables.tb_user, async () => {
      const { dbh, dict } = km

      const trx = await dbh.transaction()
      assert(trx)
      let uidTxt = 'n/a'
      let uid: number | undefined = 0

      try {
        uid = await dbh<UserDo>(dict.tables.tb_user)
          .transacting(trx)
          .forUpdate()
          .insert([ { name: 'user3', ctime: new Date() } ])
          .returning('uid')
          .then((uids) => {
            assert(uids && uids.length === 1, uids.toString())
            const row = uids[0] as unknown as {uid: number}
            return row.uid
          })
        assert(typeof uid === 'number' && uid > 0, uid?.toString())
      }
      catch (ex) {
        await trx.rollback()
        assert(false, (ex as Error).message)
      }

      uidTxt = uid ? uid.toString() : 'n/a'

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

      await trx.rollback()
    })
  })

})

