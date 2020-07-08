import { genDbDictFromType, DbModel } from '../../src/index'


export const dbDict2 = genDbDictFromType<Db>({
  forceLoadDbDictJs: true,
})

export interface Db extends DbModel {
  /**
   * @description 用户表a
   * @table 表实际名称user2
   */
  tb_user: User
  /**
   * @description 用户详情表a
   * @table 表实际名称userDetail2
   */
  tb_user_detail: { uid: number, age: number, address: string }
}

export interface User {
  uid: number
  name: string
}


export * as AC from './test.config2.__built-dict'

