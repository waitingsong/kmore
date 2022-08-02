import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { KmoreFactory, Kmore, QueryContext } from '../src/index.js'

import { config, dbDict } from './test.config.js'
import { Db, Context, UserDo } from './test.model.js'


describe(fileShortPath(import.meta.url), () => {
  let km: Kmore<Db, Context>

  const configWithPostCb = {
    ...config,
    postProcessResponse,
  }

  before(() => {
    km = KmoreFactory({ config: configWithPostCb, dict: dbDict })
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
    assert(km.postProcessResponseSet.size === 2)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should work', () => {
    it('tb_user', async () => {
      const { ref_tb_user } = km.refTables

      const ret = await ref_tb_user().select('*')
      assert(ret)
      ret.forEach((row) => {
        // @ts-ignore
        assert(row.foo === 123)
      })

      return
    })
  })

})

function postProcessResponse(
  result: any,
  queryContext?: QueryContext,
): unknown {

  assert(result)
  assert(Array.isArray(result))
  assert(queryContext)
  result.forEach((row) => {
    row.foo = 123
  })
  return result
}

