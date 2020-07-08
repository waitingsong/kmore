import { DbModel, genDbDictFromType } from '../../src/index'


genDbDictFromType<DbAlias>()

export const dbDict2 = genDbDictFromType<Db>()
export const dbDict21 = genDbDictFromType<Db>()

export interface Db extends DbModel {
  /**
   * @description 用户表a
   * @table 表实际名称user2
   */
  tb_user2: {
    uid: number,
    user_name: string,
  }
  /**
   * @description 用户详情表a
   * @table 表实际名称userDetail2
   */
  tb_user_detail2: {
    uid: number,
    address: string,
  }
}
export type DbAlias = Db

