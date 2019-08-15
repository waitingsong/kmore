import { genTbListFromType } from '../../src/lib/compiler'


genTbListFromType<TbListModelAlias>()

export const tbList2 = genTbListFromType<TbListModel>()

export interface TbListModel {
  /**
   * @description 用户表a
   * @table 表实际名称user2
   */
  tb_user2: string
  /**
   * @description 用户详情表a
   * @table 表实际名称userDetail2
   */
  tb_user_detail2: string
}
export type TbListModelAlias = TbListModel
