import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import {
  DbTagMap,
  RetrieveInfoFromTypeOpts,
} from '../src/index'
import { retrieveLocalTypeItemFromType, genDbDictFromType } from '../src/lib/compiler'
import { cacheMap } from '../src/lib/config'
import { buildDbParam } from '../src/lib/util'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should buildTbListParamArray() works', () => {
    it('with noraml value', () => {
      const list = {
        user: 'tb_user',
        userDetail: 'tb_user_detail',
      }
      const tagMap = new Map() as DbTagMap

      Object.keys(list).forEach(tb => tagMap.set(tb, []))

      const ret = buildDbParam(tagMap)

      assert(ret && Object.keys(ret).length === Object.keys(list).length)
      Object.keys(list).forEach((key) => {
        assert(typeof list[key] === 'string', `Should tables.includes("${key}")`)
      })
    })

    it('with void value', () => {
      ['', 0, true, false, null, void 0].forEach((val) => {
        try {
          // @ts-ignore
          buildDbParam(val)
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
          line: 8,
          column: 23,
        },
      }

      const ret = retrieveLocalTypeItemFromType(opts)
      assert(ret)
      assert(ret && ret.localTypeId && ret.localTypeId.includes(opts.caller.path))
    })

    it('with fake caller.line', () => {
      const opts: RetrieveInfoFromTypeOpts = {
        cacheMap: {
          ...cacheMap,
        },
        caller: {
          path: './test/test.config.ts',
          line: 0,
          column: 23,
        },
      }

      const ret = retrieveLocalTypeItemFromType(opts)
      assert(! ret)
    })

    it('with fake caller.column', () => {
      const opts: RetrieveInfoFromTypeOpts = {
        cacheMap: {
          ...cacheMap,
        },
        caller: {
          path: './test/test.config.ts',
          line: 8,
          column: 230,
        },
      }

      const ret = retrieveLocalTypeItemFromType(opts)
      assert(! ret)
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
      }

      const ret = retrieveLocalTypeItemFromType(opts)
      assert(! ret)
    })
  })

  describe('Should genDbDictFromType() works', () => {
    it('with invalid generics type param', () => {
      try {
        genDbDictFromType<{ tb_user: { uid: number } }>()
      }
      catch (ex) {
        return
      }
      assert(false, 'Should throw error but not')
    })
  })

})

