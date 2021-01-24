import { DbModel, genDbDictFromType } from '../../src'
import { User, UserDetail } from '../test.model'

// eslint-disable-next-line import/order
import assert = require('power-assert')


// will create type alias for equal type declartion to the Db
export const dbDict = genDbDictFromType<Db2>()

assert(dbDict && Object.keys(dbDict.tables).length > 0)
assert(Object.keys(dbDict.columns.tb_user).length > 0)
assert(Object.keys(dbDict.columns.tb_user_detail).length > 0)
assert(Object.keys(dbDict.tables).length === Object.keys(dbDict.columns).length)

export interface Db2 extends DbModel {
  tb_user: User
  tb_user_detail: UserDetail
}

