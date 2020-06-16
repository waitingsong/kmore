import { genTbListFromType, KTablesBase } from 'kmore-types'

import { TTables, KTables } from '../../src'
import { User, UserDetail } from '../test.model'


export const kTables31 = genFoo<UserInfoModel>(0)

export interface UserInfoModel extends TTables {
  tb_user: User
  tb_user_detail: UserDetail
}
export type TbListModelAlias = UserInfoModel


function genFoo<T extends TTables>(distance: number): KTablesBase<T> {
  return genBar<T>(distance + 1)
}

function genBar<T extends TTables>(distance: number): KTablesBase<T> {
  const kTables = genTbListFromType<T>({
    /**
     * 2: the caller with generics type is up to two level, genFoo() -> fenBar(),
     * 1: up to one level, outer genBar() -> genTbListFromType(),
     * 0: calling genTbListFromType() with generics type directly
     */
    callerDistance: distance + 1, // now is 2
  })
  return kTables
}

