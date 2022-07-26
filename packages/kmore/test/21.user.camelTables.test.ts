import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { kmoreFactory, Kmore } from '../src/index.js'

import { validateUserRowsDTO } from './helper.js'
import { config, dbDict } from './test.config.js'
import { Db } from './test.model.js'


describe(fileShortPath(import.meta.url), () => {
  let km: Kmore<Db>

  before(() => {
    km = kmoreFactory({ config, dict: dbDict })
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should read table with tables param in object work', () => {
    it('tb_user', async () => {
      const { camelTables } = km
      const { ref_tb_user } = km.camelTables

      // validate insert result
      const countRes = await km.camelTables.ref_tb_user().count()
      const ret = await km.camelTables.ref_tb_user().select('*')
      assert(
        ret.length === 3,
        `Should count be "3", but got ${JSON.stringify(ret)}`,
      )
      assert(
        countRes[0] && countRes[0]['count'] === '3',
        `Should count be "3", but got ${JSON.stringify(ret)}`,
      )

      const countRes2 = await camelTables.ref_tb_user().count()
      assert(
        countRes2[0] && countRes2[0]['count'] === '3',
        `Should count be "3", but got ${JSON.stringify(ret)}`,
      )

      const countRes3 = await ref_tb_user().count()
      assert(
        countRes3[0] && countRes3[0]['count'] === '3',
        `Should count be "3", but got ${JSON.stringify(ret)}`,
      )

      await ref_tb_user().select('*')
        .then((rows) => {
          validateUserRowsDTO(rows)
          return rows
        })
        .catch((err: Error) => {
          assert(false, err.message)
        })

      return
    })
  })

})

