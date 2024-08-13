import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { KmoreFactory, type Kmore } from '##/index.js'
import { validateUserRowsDTO } from '#@/helper.js'
import { config, dbDict } from '#@/test.config.js'
import type { Db } from '#@/test.model.js'


describe(fileShortPath(import.meta.url), () => {
  let km: Kmore<Db>

  before(() => {
    km = KmoreFactory({ config, dict: dbDict })
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should read table with tables param in object work', () => {
    it('tb_user', async () => {
      const { camelTables } = km
      const { tb_user } = km.camelTables

      // validate insert result
      const countRes = await km.camelTables.tb_user().count()
      const ret = await km.camelTables.tb_user().select('*')
      assert(
        ret.length === 3,
        `Should count be "3", but got ${JSON.stringify(ret)}`,
      )
      assert(
        countRes[0] && countRes[0]['count'] === '3',
        `Should count be "3", but got ${JSON.stringify(ret)}`,
      )

      const countRes2 = await camelTables.tb_user().count()
      assert(
        countRes2[0] && countRes2[0]['count'] === '3',
        `Should count be "3", but got ${JSON.stringify(ret)}`,
      )

      const countRes3 = await tb_user().count()
      assert(
        countRes3[0] && countRes3[0]['count'] === '3',
        `Should count be "3", but got ${JSON.stringify(ret)}`,
      )

      await tb_user().select('*')
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

