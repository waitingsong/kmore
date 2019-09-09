import { DbTables, TTableListModel } from '../../src'
import { genTbListFromType } from '../../src/lib/compiler'
import { User, UserDetail } from '../test.model'


export const tbList3 = genFoo<UserInfoModel>()

export interface UserInfoModel {
  tb_user: User
  tb_user_detail: UserDetail
}
export type TbListModelAlias = UserInfoModel


function genFoo<T extends TTableListModel>(): DbTables<T> {
  const tbList = genTbListFromType<T>({
    /**
     * 1: the caller with generics type is up to one level, genFoo() -> genTbListFromType(),
     * 0: calling genTbListFromType() with generics type directly
     */
    callerDistance: 1,
  })
  return tbList
}
