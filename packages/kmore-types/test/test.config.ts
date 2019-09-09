
import { DbTables } from '../src/index'
import { genTbListFromType } from '../src/lib/compiler'

import { TbListModel } from './test.model'


// for demo
export const tbListObj: DbTables<TbListModel> = {
  tb_user: 'tb_user',
  tb_user_detail: 'tb_user_detail',
}
export const tbList = genTbListFromType<TbListModel>()
if (Object.keys(tbList).length === 0) {
  throw new Error('tbList empty.')
}

