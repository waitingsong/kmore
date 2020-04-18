import * as assert from 'power-assert'

import { Tables } from '../src/index'
import { genTbListFromType } from '../src/lib/compiler'

import { TbListModel } from './test.model'


// for demo
export const tbListObj: Tables<TbListModel> = {
  tb_user: 'tb_user',
  tb_user_detail: 'tb_user_detail',
}
export const tbList = genTbListFromType<TbListModel>()

assert(tbList && Object.keys(tbList.tables).length > 0)
assert(Object.keys(tbList.columns.tb_user).length > 0)
assert(Object.keys(tbList.columns.tb_user_detail).length > 0)
assert(Object.keys(tbList.tables).length === Object.keys(tbList.columns).length)

