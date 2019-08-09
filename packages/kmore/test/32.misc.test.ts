import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import {
  kmore,
  TbListTagMap,
  RetrieveInfoFromTypeOpts,
  DbModel,
} from '../src/index'
import { initOptions, cacheMap } from '../src/lib/config'
import { buildTbListParam } from '../src/lib/util'
import { retrieveLocalTypeMapFromType, genTbListFromType } from '../src/lib/compiler'

import { config } from './test.config'
import { TbListModel, TbListModelAlias } from './test.model'


const filename = basename(__filename)

describe(filename, () => {
  let db: DbModel<TbListModel>

  before(async () => {
    db = kmore<TbListModel>(config)
  })
  after(async () => {
    await db.dbh.destroy() // !
  })

  describe('Should genTbListFromType() works', () => {
    it('with noraml type', () => {
      const { tables, refTables } = db
      const ret = genTbListFromType<TbListModel>()

      assert(ret && Object.keys(ret).length === Object.keys(tables).length)
      Object.keys(ret).forEach((tb) => {
        assert(typeof tables[tb] === 'string', `Should tables.includes("${tb}")`)
      })
    })

    it('with alias type', () => {
      const { tables, refTables } = db
      const ret = genTbListFromType<TbListModelAlias>()

      assert(ret && Object.keys(ret).length === Object.keys(tables).length)
      Object.keys(ret).forEach((tb) => {
        assert(typeof tables[tb] === 'string', `Should tables.includes("${tb}")`)
      })
    })
  })


  describe('Should assignment of tablesRef name works', () => {
    it('normal', () => {
      const { tables, refTables } = db
      Object.keys(tables).forEach((tb) => {
        const tbRef = refTables[tb]
        assert(typeof tbRef === 'function')
        assert(tbRef.name === `${initOptions.refTablesPrefix}${tb}`)
      })
    })
  })


  describe('Should buildTbListParamArray() works', () => {
    it('with noraml value', () => {
      const list = {
        user: 'tb_user',
        userDetail: 'tb_user_detail',
      }
      const tagMap: TbListTagMap = new Map()

      Object.keys(list).forEach(tb => tagMap.set(tb, []))

      const ret = buildTbListParam(tagMap)

      assert(ret && Object.keys(ret).length === Object.keys(list).length)
      Object.keys(list).forEach((key) => {
        assert(typeof list[key] === 'string', `Should tables.includes("${key}")`)
      })
    })

    it('with void value', () => {
      ['', 0, true, false, null, void 0].forEach((val) => {
        try {
          // @ts-ignore
          buildTbListParam(val)
        }
        catch (ex) {
          return
        }
        assert(false, 'Should throw error but NOT.')
      })
    })
  })

  describe('Should retrieveInfoFromType() works', () => {
    it('with valid options', () => {
      const opts: RetrieveInfoFromTypeOpts = {
        cacheMap: {
          ...cacheMap,
        },
        caller: {
          path: './test/test.config.ts',
          line: 31,
          column: 23,
        },
        callerFuncNames: 'genTbListFromType',
      }

      const ret = retrieveLocalTypeMapFromType(opts)
      assert(ret.size === 1)
      for (const key of ret.keys()) {
        assert(key && key.includes(opts.caller.path))
      }
    })

    it('with fake caller.line', () => {
      const opts: RetrieveInfoFromTypeOpts = {
        cacheMap: {
          ...cacheMap,
        },
        caller: {
          path: './test/test.config.ts',
          line: 29,
          column: 23,
        },
        callerFuncNames: 'genTbListFromGenerics',
      }

      const ret = retrieveLocalTypeMapFromType(opts)
      assert(ret && ret.size === 0)
    })

    it('with fake callerFuncName', () => {
      const opts: RetrieveInfoFromTypeOpts = {
        cacheMap: {
          ...cacheMap,
        },
        caller: {
          path: './test/test.config.ts',
          line: 30,
          column: 23,
        },
        callerFuncNames: 'genTbListFromGenerics<',
      }

      const ret = retrieveLocalTypeMapFromType(opts)
      assert(ret && ret.size === 0)
    })


    it('with fake caller.column', () => {
      const opts: RetrieveInfoFromTypeOpts = {
        cacheMap: {
          ...cacheMap,
        },
        caller: {
          path: './test/test.config.ts',
          line: 30,
          column: 22,
        },
        callerFuncNames: 'genTbListFromGenerics',
      }

      const ret = retrieveLocalTypeMapFromType(opts)
      assert(ret && ret.size === 0)
    })

    it('with fake caller.path', () => {
      const opts: RetrieveInfoFromTypeOpts = {
        cacheMap: {
          ...cacheMap,
        },
        caller: {
          path: './node_modules/.bin/tsc',
          line: 1,
          column: 1,
        },
        callerFuncNames: 'genTbListFromGenerics',
      }

      const ret = retrieveLocalTypeMapFromType(opts)
      assert(ret && ret.size === 0)
    })
  })

})
