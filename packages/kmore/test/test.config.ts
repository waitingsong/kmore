import { Config, DbTables, genTbListFromType } from '../src/index'

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
  pool: { min: 2, max: 10 },
}

// for demo
export const tbListObj: DbTables<TbListModel> = {
  tb_user: 'tb_user',
  tb_user_detail: 'tb_user_detail',
}
export const tbList = genTbListFromType<TbListModel>()
if (Object.keys(tbList).length === 0) {
  throw new Error('tbList empty.')
}

