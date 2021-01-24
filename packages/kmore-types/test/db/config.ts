import { genDbDictFromType } from '../../src/lib/compiler'

import { Db } from './model'

// eslint-disable-next-line import/order
import assert = require('power-assert')


export const dbDict = genDbDictFromType<Db>()

assert(dbDict && Object.keys(dbDict.tables).length > 0)
assert(Object.keys(dbDict.columns.tb_user).length > 0)
assert(Object.keys(dbDict.columns.tb_user_detail).length > 0)
assert(Object.keys(dbDict.tables).length === Object.keys(dbDict.columns).length)
