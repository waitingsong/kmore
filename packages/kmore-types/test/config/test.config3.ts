import { genTbListFromType } from '../../src/lib/compiler'
import { DbTables, TTableListModel } from '../../src'
import { User, UserDetail } from '../test.model'


export const tbList3 = genFoo<UserInfoModel>()

export interface UserInfoModel {
  tb_user: User
  tb_user_detail: UserDetail
}
export type TbListModelAlias = UserInfoModel


function genFoo<T extends TTableListModel>(): DbTables<T> {
  const tbList = genTbListFromType<T>({
    callerDistance: 2,
  })
  return tbList
}
