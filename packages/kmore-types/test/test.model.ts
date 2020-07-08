import { TableModel, DbModel } from '../src'


/** table_name as key */
export interface Db extends DbModel {
  /**
   * @description 用户表
   * @table 表实际名称user
   */
  tb_user: User
  /**
   * @description 用户详情表
   * @table 表实际名称userDetail
   */
  tb_user_detail: UserDetail
}
export interface Db2 extends DbModel {
  /**
   * @description 用户表
   * @table 表实际名称user
   */
  tb_user: User2
  /**
   * @description 用户详情表
   * @table 表实际名称userDetail
   */
  tb_user_detail: UserDetail
}

/**
 * @description User用户表字段定义
 */
export interface User {
  uid: number
  name: string
  ctime: Date | 'now()'
}
export interface User2 {
  uid: number
  name: string
  ctime: Date | 'now()'
  pwd: string
}

export interface UserDetail {
  /**
   * @tableModel UserDetail
   * @jointName userDetailUid
   * @description 用户详情表uid字段
   */
  uid: number
  age: number
  /** 住址 */
  address: string
}

const tables = {
  tb_user: 'tb_user',
  tb_user_detail: 'tb_user_detail',
} as const

const columns = {
  tb_user: {
    uid: 'uid',
    name: 'name',
    ctime: 'ctime',
  },
  tb_user_detail: {
    uid: 'uid',
    age: 'age',
    address: 'address',
  },
} as const

const scopedColumns = {
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
export type KDB = typeof kdbConst
export type KDD = typeof kddConst

