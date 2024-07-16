import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { KmoreFactory, type Kmore } from '../src/index.js'

import { validateUserRows } from './helper.js'
import { config, dbDict } from './test.config.js'
import type { Db, UserDo } from './test.model.js'


describe(fileShortPath(import.meta.url), () => {
  let km: Kmore<Db>

  before(() => {
    km = KmoreFactory({ config, dict: dbDict })
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should builder.dummy() exists', () => {
    it('normal', async () => {
      const { refTables } = km
      const { tb_user } = km.refTables

      assert(typeof refTables.tb_user().dummy === 'function', 'dummy() not exists')

      // validate insert result
      const countRes = await km.refTables.tb_user().dummy().count()
      const ret = await km.refTables.tb_user().select('uid').dummy<Db>()
        .select('ctime')
      assert(
        ret.length === 3,
        `Should count be "3", but got ${JSON.stringify(ret)}`,
      )
      assert(
        countRes[0] && countRes[0]['count'] === '3',
        `Should count be "3", but got ${JSON.stringify(ret)}`,
      )

      await tb_user().select('uid').dummy()
        .select('*')
        .then((rows) => {
          validateUserRows(rows)
          return rows
        })
        .catch((err: Error) => {
          assert(false, err.message)
        })

      return
    })
  })

})

