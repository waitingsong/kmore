import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { kmore, DbModel } from '../src/index'

import { config } from './test.config'
import { TbListModel } from './test.model'


const filename = basename(__filename)

describe(filename, () => {
  let db: DbModel<TbListModel>

  before(() => {
    db = kmore<TbListModel>(
      {
        config,
        options: {
          // load test/51.load-js.test.__built-tables.js
          forceLoadTbListJs: true,
          forceLoadTbListJsPathReplaceRules: [ [/foo\d+/u, '__built-tables'] ],
          outputFileNameSuffix: 'foo1234',
        },
      },
      null,
    )
  })

  after(async () => {
    await db.dbh.destroy() // !
  })

  describe('Should loading tables works', () => {
    it('normal', () => {
      assert(db.tables && Object.keys(db.tables).length)
    })
  })

  describe('Should loading columns works', () => {
    it('normal', () => {
      assert(db.columns && Object.keys(db.columns).length)
    })
  })

  describe('Should loading aliasColumns works', () => {
    it('normal', () => {
      assert(db.aliasColumns && Object.keys(db.aliasColumns).length)
    })
  })

  describe('Should loading scopedColumns works', () => {
    it('normal', () => {
      assert(db.scopedColumns && Object.keys(db.scopedColumns).length)
    })
  })

})

