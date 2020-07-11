/* eslint-disable @typescript-eslint/restrict-template-expressions */
import {
  basename,
  pathResolve,
  normalize,
  unlinkAsync,
  isFileExists,
  readFileAsync,
  join,
} from '@waiting/shared-core'
import * as assert from 'power-assert'

import {
  dictObjectEquals,
  DbDict,
  hasSameDictVar,
  retrieveDictVarsFrom,
} from '../src/index'
import {
  validateParamTables,
  validateTbName,
} from '../src/lib/util'

import { dbDict as dbDictExample } from './buildSource/42.buildDbDictTypeFile.result-example'
import { dbDict } from './test.config'
import { Db } from './test.model'


const filename = basename(__filename)
const path = join(__dirname, 'buildSource/42.buildDbDictTypeFile.result-example.ts')

describe(filename, () => {

  describe('Should validateTables() works', () => {
    it('with valid value', () => {
      const tbs = { ...dbDict.tables }

      try {
        validateParamTables(tbs)
        validateParamTables(dbDict.tables)
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
          validateParamTables(val)
        }
        catch (ex) {
          return assert(true)
        }
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        assert(false, 'Should throw error, but NOT. Value:' + val)
      })

      // symbol unenumerable with Object.entries()
      // used as empty object
      validateParamTables({
        [Symbol('foo')]: 'tb',
      })
    })
  })


  describe('Should validateTableName() works', () => {
    it('with invalid object value', () => {

      ['', true, false, null, void 0, 123].forEach((val) => {
        try {
          validateTbName(val)
          assert(false, `Should throw error, but NOT with "${val}"`)
        }
        catch (ex) {
          return
        }
      })
    })
  })


  describe('Should retrieveDictVarsFrom(), dictObjectEquals() works', () => {
    it('normal', async () => {
      const content = (await readFileAsync(path)).toString()
      const dicts = retrieveDictVarsFrom(content)

      dicts.forEach((dict) => {
        const eq = dictObjectEquals(dict, dbDictExample)
        assert(eq === true)
        const eq2 = dictObjectEquals(dbDictExample, dict)
        assert(eq2 === true)
      })
    })
    it('normal2', async () => {
      const content = (await readFileAsync(path)).toString()
      const dicts: DbDict[] = retrieveDictVarsFrom(content)

      dicts.forEach((dict) => {
        const needle = JSON.parse(JSON.stringify(dbDict))

        needle.aliasColumns.tb_user.uid.fake = Math.random().toString()
        const ret1 = dictObjectEquals(dict, needle)
        assert(ret1 === false, JSON.stringify(needle))

        delete needle.aliasColumns.tb_user.uid.fake
        const ret2 = dictObjectEquals(dict, needle)
        assert(ret2 === true, JSON.stringify({
          needle, dict,
        }))

        needle.aliasColumns.tb_user.uid.tbUserUid = Math.random().toString()
        const ret3 = dictObjectEquals(dict, needle)
        assert(ret3 === false)

        delete dict.aliasColumns.tb_user.uid
        delete needle.aliasColumns.tb_user.uid
        const ret4 = dictObjectEquals(dict, needle)
        assert(ret4 === true)

        needle.scopedColumns.tb_user.uid = Math.random().toString()
        const ret5 = dictObjectEquals(dict, needle)
        assert(ret5 === false)

        delete dict.scopedColumns.tb_user.uid
        delete needle.scopedColumns.tb_user.uid
        const ret6 = dictObjectEquals(dict, needle)
        assert(ret6 === true)

        delete dict.scopedColumns.tb_user
        delete needle.scopedColumns.tb_user
        const ret7 = dictObjectEquals(dict, needle)
        assert(ret7 === true)

        delete dict.scopedColumns
        delete needle.scopedColumns
        try {
          const ret8 = dictObjectEquals(dict, needle)
        }
        catch (ex) {
          return
        }
        assert(false, 'Should throw error, but not.')
      })
    })
  })

  describe('Should hasSameDictVar()  works', () => {
    it('normal', async () => {
      const content = (await readFileAsync(path)).toString()
      const ret = hasSameDictVar(content, dbDict)
      assert(ret === true)
    })
    it('normal', async () => {
      const content = (await readFileAsync(path)).toString()
      const needle: DbDict<Db> = JSON.parse(JSON.stringify(dbDict))
      needle.tables.tb_user = Math.random().toString()
      const ret = hasSameDictVar(content, needle)
      assert(ret === false)
    })
  })
})

