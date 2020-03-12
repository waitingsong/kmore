
import { Tables } from '../src/index'
import { genTbListFromType } from '../src/lib/compiler'

import { TbListModel } from './test.model'


// for demo
export const tbListObj: Tables<TbListModel> = {
  tb_user: 'tb_user',
  tb_user_detail: 'tb_user_detail',
}
export const tbList = genTbListFromType<TbListModel>()
if (! tbList || Object.keys(tbList.tables).length === 0) {
  throw new Error('tbList empty.')
}
if (Object.keys(tbList.tables).length !== Object.keys(tbList.columns).length) {
  throw new Error('tables not equal.')
}

