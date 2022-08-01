import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'

import { KmoreFactory, Kmore, EventCallbacks, KmoreEvent } from '../src/index.js'

import { validateUserRows } from './helper.js'
import { config, dbDict } from './test.config.js'
import { Db, Context, UserDo } from './test.model.js'


describe(fileShortPath(import.meta.url), () => {
  let km: Kmore<Db, Context>

  before(() => {
    const cbs: EventCallbacks = {
      start: cbOnStart,
      query: cbOnQuery,
      queryResponse: cbOnResp,
    }
    km = KmoreFactory({ config, dict: dbDict, eventCallbacks: cbs })
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should work', () => {
    it('tb_user', async () => {
      const { refTables } = km
      const { ref_tb_user } = km.refTables

      const ctx: Context = {
        uid: 9,
        ver: '1',
      }

      // validate insert result
      const countRes = await km.refTables.ref_tb_user(ctx).count()
      const ret = await km.refTables.ref_tb_user().select('*')
      assert(
        ret.length === 3,
        `Should count be "3", but got ${JSON.stringify(ret)}`,
      )
      assert(
        countRes[0] && countRes[0]['count'] === '3',
        `Should count be "3", but got ${JSON.stringify(ret)}`,
      )

      await ref_tb_user(ctx).select('*')
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

async function cbOnStart(event: KmoreEvent, ctx?: Context): Promise<void > {
  assert(ctx)
  assert(ctx.uid === 9)
  assert(event.type === 'start', event.type)
  assert(event.queryBuilder)
  assert(! event.data)
  assert(! event.respRaw)
}

async function cbOnQuery(event: KmoreEvent, ctx?: Context): Promise<void > {
  assert(ctx)
  assert(ctx.uid === 9)
  assert(event.type === 'query', event.type)
  assert(! event.queryBuilder)
  assert(event.data)
  assert(! event.respRaw)
}


async function cbOnResp(event: KmoreEvent, ctx?: Context): Promise<void > {
  assert(ctx)
  assert(ctx.uid === 9)
  assert(event.type === 'queryResponse', event.type)
  assert(! event.queryBuilder)
  assert(! event.data)
  assert(event.respRaw)
}

