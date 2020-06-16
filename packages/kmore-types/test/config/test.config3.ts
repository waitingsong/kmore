import { KTablesBase, TTables } from '../../src'
import { genTbListFromType } from '../../src/lib/compiler'
import { User, UserDetail } from '../test.model'


export const tbList3 = genFoo<UserInfoModel>(0)

export interface UserInfoModel extends TTables {
  tb_user: User
  tb_user_detail: UserDetail
}
export type TbListModelAlias = UserInfoModel


function genFoo<T extends TTables>(distance: number): KTablesBase<T> {
  const tbList = genTbListFromType<T>({
    /**
     * 1: the caller with generics type is up to one level, genFoo() -> genTbListFromType(),
     * 0: calling genTbListFromType() with generics type directly
     */
    callerDistance: distance + 1, // now is 1
  })
  return tbList
}

