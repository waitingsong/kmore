import { basename } from '@waiting/shared-core'

import { kmore, Kmore } from '../src/index'

import { validateUserRows } from './helper'
import { config } from './test.config'
import { User, Db } from './test.model'

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

  describe('Should read table with tables param in object works', () => {
    it('tb_user', async () => {
      const { rb } = km
      const { tb_user } = km.rb

      // validate insert result
      const countRes = await km.rb.tb_user().count()
      const ret = await km.rb.tb_user().select('*')
      assert(
        ret.length === 2,
        `Should count be "2", but got ${JSON.stringify(ret)}`,
      )
      assert(
        countRes[0].count === '2',
        `Should count be "2", but got ${JSON.stringify(ret)}`,
      )

      const countRes2 = await rb.tb_user().count()
      assert(
        countRes2[0].count === '2',
        `Should count be "2", but got ${JSON.stringify(ret)}`,
      )

      const countRes3 = await tb_user().count()
      assert(
        countRes3[0].count === '2',
        `Should count be "2", but got ${JSON.stringify(ret)}`,
      )

      await tb_user().select('*')
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

