import * as assert from 'power-assert'

import { KnexConfig, Tables, genDbDictFromType, DbDict } from '../src/index'

import { Db } from './test.model'


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

// for demo
export const dbDictObj: Tables<Db> = {
  tb_user: 'tb_user',
  tb_user_detail: 'tb_user_detail',
}
export const dbDict: DbDict<Db> = genDbDictFromType<Db>()

assert(dbDict && Object.keys(dbDict.tables).length > 0)
assert(Object.keys(dbDict.columns.tb_user).length > 0)
assert(Object.keys(dbDict.columns.tb_user_detail).length > 0)
assert(Object.keys(dbDict.tables).length === Object.keys(dbDict.columns).length)

