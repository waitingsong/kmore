import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { kmore, DbModel } from '../src/index'

import { config } from './test.config'
import { TbListModel } from './test.model'


const filename = basename(__filename)

describe(filename, () => {
  let db: DbModel<TbListModel>

  before(() => {
    db = kmore<TbListModel>({ config })
    assert(db.tables && Object.keys(db.tables).length > 0)
  })
  after(async () => {
    await db.dbh.destroy() // !
  })

  describe('Should accessing db.<tables> works', () => {
    it('with valid table value', async () => {
      const { tables, rb } = db

      for (const tbAlias of Object.keys(tables)) {
        assert(
          tbAlias && typeof rb[tbAlias] === 'function',
          `Should db.${tbAlias} be typeof function, but not.`,
        )
      }
    })

    it('with valid table value', async () => {
      const { rb } = db;

      [
        Math.random(),
        Math.random().toString(),
        'foo',
        true,
        false,
        null,
        void 0,
        0,
        123,
        Symbol('foo'),
      ].forEach((val) => {
        // @ts-ignore
        assert(typeof rb[val] === 'undefined')

        try {
          // @ts-ignore
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          db[val]()
        }
        catch (ex) {
          return
        }
        assert(false, 'Should throw error during accessing non exists props')
      })
    })
  })

})

