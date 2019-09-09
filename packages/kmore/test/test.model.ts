
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
}

export interface UserDetail {
  uid: number
  age: number
  address: string
}

