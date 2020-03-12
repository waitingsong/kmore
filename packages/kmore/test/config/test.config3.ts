import { genTbListFromType, KTablesBase } from 'kmore-types'

import { TTables } from '../../src'
import { User, UserDetail } from '../test.model'


export const kTablesBase3 = genFoo<UserInfoModel>()
export const kTablesBase4 = genFoo<UserInfoModel>()

export interface UserInfoModel {
  tb_user: User
  tb_user_detail: UserDetail
}
export type TbListModelAlias = UserInfoModel


function genFoo<T extends TTables>(): KTablesBase<T> {
  const kTables = genTbListFromType<T>({
    /**
     * 1: the caller with generics type is up to one level, genFoo() -> genTbListFromType(),
     * 0: calling genTbListFromType() with generics type directly
     */
    callerDistance: 1,
  })
  return kTables
}
