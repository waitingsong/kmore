export type TbListModelAlias = TbListModel

/** table_name as key */
export interface TbListModel {
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

/**
 * @description User用户表字段定义
 */
export interface User {
  uid: number
  name: string
  ctime: Date | 'now()'
  userName: string
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

export type JointTableColumnsAlias<T = any> = {
  [col in keyof T]: ColAlias<T[col]>
}
export const jointTableUserDetail: JointTableColumnsAlias<UserDetail> = {
  uid: {
    in: 'tb_user_detail.uid',
    out: 'userDetailUid',
    result: 0,
  },
  age: {
    in: 'tb_user_detail.uid',
    out: 'userDetailUid',
    result: 13,
  },
  address: {
    in: 'tb_user_detail.uid',
    out: 'userDetailUid',
    result: 'ff',
  },
}
export interface ColAlias<T> {
  /** input column name */
  in: string
  /** output column alias name */
  out: string
  result: T
}
export type JointRetTable<K extends JointTableColumnsAlias> = {
  [col in keyof K]: K[col]['result']
}
export const jointRetUserDetail: JointRetTable<typeof jointTableUserDetail> = {
  address: 'add',
  uid: 333,
  age: 23,
}

