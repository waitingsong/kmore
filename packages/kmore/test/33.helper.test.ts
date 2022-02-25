import assert from 'assert/strict'
import { relative } from 'path'

import {
  kmoreFactory,
  Kmore,
  getCurrentTime,
  EnumClient,
} from '../src/index'

import { config, dbDict } from './test.config'
import { Db } from './test.model'


const filename = relative(process.cwd(), __filename).replace(/\\/ug, '/')

describe(filename, () => {
  let km: Kmore<Db>

  before(() => {
    km = kmoreFactory<Db>({ config, dict: dbDict })
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
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


