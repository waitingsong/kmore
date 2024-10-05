
import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import type { EventCallbacks, Kmore, KmoreEvent } from '##/index.js'
import { KmoreFactory } from '##/index.js'
import { validateUserRows } from '#@/helper.js'
import { config, dbDict } from '#@/test.config.js'
import type { Db } from '#@/test.model.js'


describe(fileShortPath(import.meta.url), () => {
  let km: Kmore<Db>

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
      const { tb_user } = km.refTables

      // validate insert result
      const countRes = await km.refTables.tb_user().count()
      const ret = await km.refTables.tb_user().select('*')
      assert(
        ret.length === 3,
        `Should count be "3", but got ${JSON.stringify(ret)}`,
      )
      assert(
        countRes[0] && countRes[0]['count'] === '3',
        `Should count be "3", but got ${JSON.stringify(ret)}`,
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

function cbOnStart(event: KmoreEvent): void {
  assert(event.type === 'start', event.type)
  assert(event.queryBuilder)
  assert(! event.data)
  assert(! event.respRaw)
}

function cbOnQuery(event: KmoreEvent): void {
  assert(event.type === 'query', event.type)
  assert(event.queryBuilder)
  assert(event.data)
  assert(! event.respRaw)
}


function cbOnResp(event: KmoreEvent): void {
  assert(event.type === 'queryResponse', event.type)
  assert(event.queryBuilder)
  assert(! event.data)
  assert(event.respRaw)
}

