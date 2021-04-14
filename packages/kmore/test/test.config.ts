import { KnexConfig, genDbDict } from '../src/index'

import { Db } from './test.model'

// eslint-disable-next-line import/order
import assert = require('power-assert')


export const config: KnexConfig = {
  client: 'pg',
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

export const dbDict = genDbDict<Db>()

assert(dbDict && Object.keys(dbDict.tables).length > 0)
assert(Object.keys(dbDict.columns.tb_user).length > 0)
assert(Object.keys(dbDict.columns.tb_user_ext).length > 0)
assert(Object.keys(dbDict.tables).length === Object.keys(dbDict.columns).length)

