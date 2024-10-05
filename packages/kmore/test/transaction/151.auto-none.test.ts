import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'
import { genDbDict } from 'kmore-types'

import { KmoreFactory } from '##/index.js'
import { config } from '#@/test.config.js'
import type { Db } from '#@/test.model.js'

import { updateWithoutTrx } from './helper.js'


describe(fileShortPath(import.meta.url), () => {
  const dict = genDbDict<Db>()
  const km = KmoreFactory({ config, dict })

  before(() => {
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    if (km.dbh?.destroy) {
      await km.dbh.destroy() // !
    }
  })

  beforeEach(async () => {
    await updateWithoutTrx(km, new Date())
  })
  describe('Should auto (none) work', () => {
    const msg = 'debug test error'

    it('case 1', async () => {
      const trx = await km.transaction({ trxActionOnError: 'none' })
      assert(trx)
      const tbUser = km.camelTables.tb_user()
      const { kmoreQueryId } = tbUser

      try {
        await tbUser
          .transacting(trx)
          .forUpdate()
          .select('*')
          .where('uid', 1)
          .then(() => {
            return Promise.reject(new Error(msg))
          })
      }
      catch (ex) {
        assert(ex instanceof Error)
        assert(ex.message === msg, ex.message)
        assert(! trx.isCompleted())

        const { kmoreTrxId } = trx
        const qidMap = km.getQueryIdListByTrxId(kmoreTrxId)
        assert(qidMap && qidMap.size > 0)
        assert(qidMap.has(kmoreQueryId))
        return
      }
      finally {
        await trx.rollback()
      }

      assert(false, 'Should throw error')
    })

    it('case 2', async () => {
      const trx = await km.transaction({ trxActionOnError: 'none' })
      assert(trx)
      const tbUser = km.camelTables.tb_user()
      const { kmoreQueryId } = tbUser
      const builder = tbUser
        .transacting(trx)
        .forUpdate()
        .select('*')
        .where('uid', 1)

      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const sql = builder.toString()
      void sql
      assert(sql, 'sql empty')
      assert(sql === 'select * from "tb_user" where "uid" = 1 for update', sql)

      const { kmoreTrxId } = trx
      const qidMap = km.getQueryIdListByTrxId(kmoreTrxId)
      assert(qidMap && qidMap.size > 0)
      assert(qidMap.has(kmoreQueryId))

      const ret = await builder
      assert(Array.isArray(ret))
      assert(ret.length === 1)

      assert(trx.isCompleted() === false)

      await trx.rollback()
      const qidMap2 = km.getQueryIdListByTrxId(kmoreTrxId)
      assert(! qidMap2)
    })

    it('case 3', async () => {
      const trx = await km.transaction({ trxActionOnError: 'none' })
      assert(trx)
      const tbUser = km.camelTables.tb_user()
      const { kmoreQueryId } = tbUser
      const builder = tbUser
        .transacting(trx)

      const builder2 = builder
        .forUpdate()
        .select('*')
        .where('uid', 1)

      // @ts-expect-error - no await
      assert(builder2 === builder)

      const { kmoreTrxId } = trx
      const qidMap = km.getQueryIdListByTrxId(kmoreTrxId)
      assert(qidMap && qidMap.size > 0)
      assert(qidMap.has(kmoreQueryId))

      // eslint-disable-next-line @typescript-eslint/await-thenable
      const ret = await builder2 as unknown as unknown[]
      assert(Array.isArray(ret))
      assert(ret.length === 1)

      assert(trx.isCompleted() === false)

      await trx.rollback()
      const qidMap2 = km.getQueryIdListByTrxId(kmoreTrxId)
      assert(! qidMap2)
    })

  })

})

