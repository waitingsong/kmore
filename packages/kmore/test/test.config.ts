import * as assert from 'power-assert'

import { Config, Tables, genTbListFromType, KTables } from '../src/index'

import { TbListModel } from './test.model'


export const config: Config = {
  client: 'pg',
  // connection: process.env.PG_CONNECTION_STRING,
  connection: {
    host: process.env.PGHOST ? process.env.PGHOST : 'localhost',
    user: process.env.PGUSER ? process.env.PGUSER : 'postgres',
    password: process.env.PGPASSWORD ? process.env.PGPASSWORD : '',
    database: 'db_ci_test',
    requestTimeout: 10000,
  },
  acquireConnectionTimeout: 10000,
  asyncStackTraces: false,
  debug: false,
  pool: { min: 5, max: 30 },
}

// for demo
export const tbListObj: Tables<TbListModel> = {
  tb_user: 'tb_user',
  tb_user_detail: 'tb_user_detail',
}
export const kTables: KTables<TbListModel> = genTbListFromType<TbListModel>()

assert(kTables && Object.keys(kTables.tables).length > 0)
assert(Object.keys(kTables.columns.tb_user).length > 0)
assert(Object.keys(kTables.columns.tb_user_detail).length > 0)
assert(Object.keys(kTables.tables).length === Object.keys(kTables.columns).length)

