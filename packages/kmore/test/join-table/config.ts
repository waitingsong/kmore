import { kmore, KnexConfig } from '../../src/index'
import { Db } from '../test.model'

// file .kmore.ts will be automatically generated
import { DbDict, dbDict } from './.kmore'

// eslint-disable-next-line import/order
import assert = require('power-assert')


export const config: KnexConfig = {
  client: 'pg',
  // connection: process.env.PG_CONNECTION_STRING,
  connection: {
    host: process.env.PGHOST ? process.env.PGHOST : 'localhost',
    user: process.env.PGUSER ? process.env.PGUSER : 'postgres',
    password: process.env.PGPASSWORD ? process.env.PGPASSWORD : 'postgres',
    database: 'db_ci_test',
    requestTimeout: 3000,
  },
  acquireConnectionTimeout: 5000,
  asyncStackTraces: false,
  debug: false,
  pool: { min: 2, max: 10 },
}

export const kmInst = kmore<Db, DbDict>({ config })
export const kmInst1 = kmore<Db, DbDict>({ config }, dbDict)
export const kmInst2 = kmore<Db, typeof dbDict>({ config }, dbDict)
export const kmInst3 = kmore<Db>({ config })

// all with input/type auto-completion,
// since passing DbDict as 2nd parameter of kmore<Db, DbDict>() or genDbDictFromType<Db, DbDict>()
assert(kmInst.tables.tb_user === 'tb_user')
assert(kmInst.columns.tb_user.uid === 'uid')
assert(kmInst.scopedColumns.tb_user.uid === 'tb_user.uid')
assert(kmInst.aliasColumns.tb_user.uid.tbUserUid === 'tb_user.uid')

