import * as assert from 'power-assert'

import { genDbDictFromType } from '../src/lib/compiler'

import { Db } from './test.model'


export const dbDict = genDbDictFromType<Db>()

assert(dbDict && Object.keys(dbDict.tables).length > 0)
assert(Object.keys(dbDict.columns.tb_user).length > 0)
assert(Object.keys(dbDict.columns.tb_user_detail).length > 0)
assert(Object.keys(dbDict.tables).length === Object.keys(dbDict.columns).length)

