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
     * 2: the caller with generics type is up to two level, genFoo() -> fenBar(),
     * 1: up to one level, outer genBar() -> genTbListFromType(),
     * 0: calling genTbListFromType() with generics type directly
     */
    callerDistance: 2,
  })
  return tbList
}

