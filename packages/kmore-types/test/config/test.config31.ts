import { genTbListFromType } from '../../src/lib/compiler'
import { DbTables, TTableListModel } from '../../src'
import { User, UserDetail } from '../test.model'


export const tbList31 = genFoo<UserInfoModel>()

export interface UserInfoModel {
  tb_user: User
  tb_user_detail: UserDetail
}
export type TbListModelAlias = UserInfoModel


function genFoo<T extends TTableListModel>(): DbTables<T> {
  return genBar<T>()
}

function genBar<T extends TTableListModel>(): DbTables<T> {
  const tbList = genTbListFromType<T>({
    /**
     * 1: means then caller with generics type is one level outer -> genFoo(),
     * 0: calling genTbListFromType() with generics type directly
     */
    callerDistance: 2,
  })
  return tbList
}

