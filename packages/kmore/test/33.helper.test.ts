import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import {
  kmore,
  Kmore,
  getCurrentTime,
  EnumClient,
} from '../src/index'

import { config } from './test.config'
import { Db } from './test.model'


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

  describe('Should getCurrentTime() works', () => {
    it('with pg', async () => {
      const time = await getCurrentTime(km.dbh, EnumClient.pg)
      assert(time)
    })

    it('with invalid client value', async () => {
      try {
        await getCurrentTime(km.dbh, '')
      }
      catch (ex) {
        assert(true)
        return
      }
      assert(false, 'Should throw error, but not.')
    })
  })

})

