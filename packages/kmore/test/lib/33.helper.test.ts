import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import type { Kmore } from '##/index.js'
import { EnumClient, KmoreFactory, getCurrentTime } from '##/index.js'
import { config, dbDict } from '#@/test.config.js'
import type { Db } from '#@/test.model.js'


describe(fileShortPath(import.meta.url), () => {
  let km: Kmore<Db>

  before(() => {
    km = KmoreFactory<Db>({ config, dict: dbDict })
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })
  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should getCurrentTime() work', () => {
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


