import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import {
  TbListTagMap,
  RetrieveInfoFromTypeOpts,
} from '../src/index'
import { retrieveLocalTypeItemFromType } from '../src/lib/compiler'
import { cacheMap } from '../src/lib/config'
import { buildTbListParam } from '../src/lib/util'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should buildTbListParamArray() works', () => {
    it('with noraml value', () => {
      const list = {
        user: 'tb_user',
        userDetail: 'tb_user_detail',
      }
      const tagMap = new Map() as TbListTagMap

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
          line: 14,
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
          line: 12,
          column: 23,
        },
      }

      const ret = retrieveLocalTypeItemFromType(opts)
      assert(! ret)
    })

    it('with fake callerFuncName', () => {
      const opts: RetrieveInfoFromTypeOpts = {
        cacheMap: {
          ...cacheMap,
        },
        caller: {
          path: './test/test.config.ts',
          line: 12,
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
          line: 14,
          column: 22,
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

})
