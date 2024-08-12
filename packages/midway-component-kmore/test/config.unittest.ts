import assert from 'node:assert/strict'

import type { Context } from '@mwcp/share'
import type { EventCallbacks } from 'kmore'
import { genDbDict } from 'kmore-types'

import type {
  Config,
  MiddlewareConfig,
  MiddlewareOptions,
  DbConfig,
  KmoreEvent,
} from '##/index.js'
import {
  initialMiddlewareConfig,
  initMiddlewareOptions,
  KmoreSourceConfig,
  initDbConfig,
} from '##/index.js'
import type { Db } from '#@/test.model.js'



export const mwConfig: Readonly<Omit<MiddlewareConfig, 'match'>> = {
  ...initialMiddlewareConfig,
  ignore: [], // !
  options: {
    ...initMiddlewareOptions,
  },
}

export const mwOptions: MiddlewareOptions = {
  ...initMiddlewareOptions,
}
export const mwConfigNoOpts: Omit<MiddlewareConfig, 'match' | 'ignore' | 'options'> = {
  ...initialMiddlewareConfig,
}


export const dbDict = genDbDict<Db>()


const eventCbs: EventCallbacks = {
  start: cbOnStart,
  query: cbOnQuery,
  queryResponse: cbOnResp,
}

export const knexConfig = {
  client: 'pg',
  connection: {
    host: process.env['POSTGRES_HOST'] ? process.env['POSTGRES_HOST'] : 'localhost',
    port: process.env['POSTGRES_PORT'] ? +process.env['POSTGRES_PORT'] : 5432,
    // database: process.env['POSTGRES_DB'] ? process.env['POSTGRES_DB'] : 'db_ci_mw',
    database: process.env['POSTGRES_DB'] ? process.env['POSTGRES_DB'] : 'db_ci_test',
    user: process.env['POSTGRES_USER'] ? process.env['POSTGRES_USER'] : 'postgres',
    password: process.env['POSTGRES_PASSWORD'] ? process.env['POSTGRES_PASSWORD'] : 'postgres',
  },
  acquireConnectionTimeout: 30000,
}

export const master: DbConfig<Db> = {
  ...initDbConfig,
  config: knexConfig,
  dict: dbDict,
  eventCallbacks: eventCbs,
  traceInitConnection: true,
}
export const kmoreConfig: Config<'master'> = {
  enableDefaultRoute: true,
  dataSource: {
    master,
  },
}

function cbOnStart(event: KmoreEvent): void {
  assert(event.type === 'start', event.type)
  assert(event.queryBuilder)
  assert(! event.data)
  assert(! event.respRaw)
}

function cbOnQuery(event: KmoreEvent): void {
  assert(event.type === 'query', event.type)
  assert(event.queryBuilder)
  assert(event.data)
  assert(! event.respRaw)
}


function cbOnResp(event: KmoreEvent): void {
  assert(event.type === 'queryResponse', event.type)
  assert(event.queryBuilder)
  assert(! event.data)
  assert(event.respRaw)
}
