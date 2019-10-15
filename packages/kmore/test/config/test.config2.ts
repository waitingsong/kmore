import { genTbListFromType } from '../../src/index'


export const tbList2 = genTbListFromType<TbListModel>({
  forceLoadTbListJs: true,
})

export interface TbListModel {
  /**
   * @description 用户表a
   * @table 表实际名称user2
   */
  tb_user: string
  /**
   * @description 用户详情表a
   * @table 表实际名称userDetail2
   */
  tb_user_detail: string
}
export type TbListModelAlias = TbListModel

