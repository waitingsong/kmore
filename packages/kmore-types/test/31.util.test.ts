/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import {
  validateParamTables,
  validateTbName,
} from '../src/lib/util'

import { tbList } from './test.config'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should validateTables() works', () => {
    it('with valid value', () => {
      const tbs = { ...tbList.tables }

      try {
        validateParamTables(tbs)
        validateParamTables(tbList.tables)
      }
      catch (ex) {
        assert(false, ex)
      }

      try {
        validateParamTables({})
      }
      catch (ex) {
        assert(false, ex)
      }
    })

    it('with invalid value', () => {
      const tbArr = [
        [],
        0,
        123,
        '  ',
        '\n',
        'constructor',
        ' constructor ',
        '__proto__',
        ' __proto__ ',
        Symbol('tb'),
      ]

      tbArr.forEach((tb) => {
        try {
          // @ts-ignore
          validateParamTables([tb])
        }
        catch (ex) {
          return assert(true)
        }
        assert(false, 'Should throw error, but NOT: ' + tb.toString())
      })

      const tbArr2 = [null, 123, true, false, void 0]
      tbArr2.forEach((val) => {
        try {
          // @ts-ignore
          validateParamTables(val)
        }
        catch (ex) {
          return
        }
        assert(false, `Should throw error, but NOT. Value: "${val}"`)
      })
    })

    it('with invalid object value', () => {
      const tbObj = {
        get: () => 'User',
        'foo'() {
          return 'abc'
        },
        user: 123,
        '  ': 'User',
        '\n': 'User',
        constructor: 'User',
        ' constructor ': 'User',
        __proto__: 'User',
        ' __proto__ ': 'User',
        tbs: Symbol('tb'),
      }

      Object.entries(tbObj).forEach((item) => {
        try {
          // @ts-ignore
          validateParamTables({ [item[0]]: item[1] })
        }
        catch (ex) {
          return assert(true)
        }
        assert(false, 'Should throw error, but NOT: ' + item.toString())
      })

      const tbArr = [null, 123, true, false]
      tbArr.forEach((val) => {
        try {
          // @ts-ignore
          validateParamTables(val)
        }
        catch (ex) {
          return assert(true)
        }
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        assert(false, 'Should throw error, but NOT. Value:' + val?.toString())
      })

      // symbol unenumerable with Object.entries()
      // used as empty object
      validateParamTables({
        [Symbol('foo')]: 'tb',
      })
    })
  })


  describe('Should validateTableName() works', () => {
    ['', true, false, null, void 0, 123].forEach((val) => {
      try {
        // @ts-ignore
        validateTbName(val)
        assert(false, `Should throw error, but NOT with "${val}"`)
      }
      catch (ex) {
        return
      }
    })

  })

})
