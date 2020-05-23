/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// @ts-ignore fake import
import { genTbListFromType, kmore, config } from 'kmore'


genTbListFromType<TbListModelAlias>()

export const tbList = genTbListFromType<TbListModel>()

export const db = kmore<TbListModel>(config)

export interface TbListModel {
  user: string
  userDetail: string
}
export type TbListModelAlias = TbListModel

