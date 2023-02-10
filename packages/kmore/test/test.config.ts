import assert from 'node:assert/strict'

import { genDbDict } from 'kmore-types'

import { KnexConfig } from '../src/index.js'

import { CI } from './root.config.js'
import { Db } from './test.model.js'


export const config: KnexConfig = {
  client: 'pg',
  connection: {
    host: process.env['POSTGRES_HOST'] ? process.env['POSTGRES_HOST'] : 'localhost',
    port: process.env['POSTGRES_PORT'] ? +process.env['POSTGRES_PORT'] : 5432,
    database: process.env['POSTGRES_DB'] ? process.env['POSTGRES_DB'] : 'db_ci_test',
    user: process.env['POSTGRES_USER'] ? process.env['POSTGRES_USER'] : 'postgres',
    password: process.env['POSTGRES_PASSWORD'] ? process.env['POSTGRES_PASSWORD'] : 'postgres',
    requestTimeout: 3000,
    statement_timeout: 3000,
  },
  pool: {
    afterCreate: (conn, done) => {
      done(null, conn)
    },
  },
  acquireConnectionTimeout: CI ? 5000 : 60000,
  debug: false,
}

export const dbDict = genDbDict<Db>()

assert(dbDict && Object.keys(dbDict.tables).length > 0)
assert(Object.keys(dbDict.columns.tb_user).length > 0)
assert(Object.keys(dbDict.columns.tb_user_ext).length > 0)
assert(Object.keys(dbDict.tables).length === Object.keys(dbDict.columns).length)

