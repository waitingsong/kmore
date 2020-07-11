import * as assert from 'power-assert'

import { DbModel } from '../../src'
import { genDbDictFromType } from '../../src/lib/compiler'


export const dbDict = genDbDictFromType<Db>()
export const dbDict2 = genDbDictFromType<Db>()

assert(dbDict && Object.keys(dbDict.tables).length > 0)
assert(Object.keys(dbDict.columns.tb_user).length > 0)
assert(Object.keys(dbDict.columns.tb_user_detail).length > 0)
assert(Object.keys(dbDict.tables).length === Object.keys(dbDict.columns).length)

interface Db extends DbModel {
  tb_user: User
}

export interface User {
  uid: number
  name: string
  ctime: Date | 'now()'
}


const tables = {
  tb_user: 'tb_user',
} as const

const columns = {
  tb_user: {
    uid: 'uid',
    name: 'name',
    ctime: 'ctime',
  },
} as const

const scopedColumns = {
  tb_user: {
    uid: 'tb_user.uid',
    name: 'tb_user.name',
    ctime: 'tb_user.ctime',
  },
} as const

const aliasColumns = {
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
} as const

export const kdbConst = {
  tables,
  columns,
}
export const kddConst = {
  tables,
  columns,
  aliasColumns,
  scopedColumns,
}
export type KDD = typeof kddConst

