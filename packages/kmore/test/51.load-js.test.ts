import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { kmore, Kmore } from '../src/index'

import { config } from './test.config'
import { Db } from './test.model'


const filename = basename(__filename)

describe(filename, () => {
  let km: Kmore<Db>

  before(() => {
    km = kmore<Db>( // do NOT change this line position
      {
        config,
        options: {
          // load test/51.load-js.test.__built-dict.js
          forceLoadDbDictJs: true,
          forceLoadDbDictJsPathReplaceRules: [ [/foo\d+/u, '__built-dict'] ],
          outputFileNameSuffix: 'foo1234',
        },
      },
      null,
    )
  })

  after(async () => {
    if (km.dbh) {
      await km.dbh.destroy()
    }
  })

  describe('Should loading tables works', () => {
    it('normal', () => {
      assert(km.tables && Object.keys(km.tables).length)
    })
  })

  describe('Should loading columns works', () => {
    it('normal', () => {
      assert(km.columns && Object.keys(km.columns).length)
    })
  })

  describe('Should loading aliasColumns works', () => {
    it('normal', () => {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      const src = tbs_16_10_aliasColumns
      const { aliasColumns: retTableCols } = km

      assert(retTableCols && Object.keys(retTableCols).length)

      Object.entries(src).forEach(([tbAlias, tbs]) => {
        const retCols = retTableCols[tbAlias]
        assert(typeof retCols === 'object')

        const len1 = Object.keys(tbs).length
        const len2 = Object.keys(retCols).length
        assert(len1 && len1 === len2)

        Object.entries(tbs).forEach(([colAlias, row]) => {
          const retRow = retCols[colAlias]
          Object.entries(retRow).forEach(([output, input]) => {
            // tb_user.uid && tbUserUid && 'tb_user.uid'  === row['tbUserUid']
            assert(input && output && input === row[output])
          })
        })
      })
    })
  })

  describe('Should loading scopedColumns works', () => {
    it('normal', () => {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      const src = tbs_16_10_scopedColumns
      const { scopedColumns: retTableCols } = km

      assert(retTableCols && Object.keys(retTableCols).length)

      Object.entries(src).forEach(([tb, tbs]) => {
        const retCols = retTableCols[tb]
        assert(typeof retCols === 'object')

        const len1 = Object.keys(tbs).length
        const len2 = Object.keys(retCols).length
        assert(len1 && len1 === len2)

        Object.entries(tbs).forEach(([colAlias, colName]) => {
          const name = retCols[colAlias]
          assert(name && name === colName)
        })
      })
    })
  })

})


// eslint-disable-next-line no-var
var tbs_16_10_scopedColumns = {
  tb_user: {
    uid: 'tb_user.uid',
    name: 'tb_user.name',
    ctime: 'tb_user.ctime',
  },
  tb_user_detail: {
    uid: 'tb_user_detail.uid',
    age: 'tb_user_detail.age',
    address: 'tb_user_detail.address',
  },
} as const

// eslint-disable-next-line no-var
var tbs_16_10_aliasColumns = {
  tb_user: {
    uid: {
      tbUserUid: 'tb_user.uid',
    },
    name: {
      tbUserName: 'tb_user.name',
    },
    ctime: {
      tbUserCtime: 'tb_user.ctime',
    },
  },
  tb_user_detail: {
    uid: {
      tbUserDetailUid: 'tb_user_detail.uid',
    },
    age: {
      tbUserDetailAge: 'tb_user_detail.age',
    },
    address: {
      tbUserDetailAddress: 'tb_user_detail.address',
    },
  },
} as const

