/* istanbul ignore file */
/* eslint-disable node/no-unpublished-import */
import assert from 'assert'

// eslint-disable-next-line import/no-extraneous-dependencies
import { Agent, Application } from 'egg'
import {
  Kmore,
  kmoreFactory,
  KnexConfig,
  getCurrentTime,
  EnumClient,
} from 'kmore'

import { pluginName } from './config'
import { ClientOptions } from './types'
import { parseOptions } from './util'


let count = 0

export function bindOnAppOrAgent(app: Application | Agent): void {
  app.addSingleton(pluginName, createOneClient)
}

function createOneClient(
  options: ClientOptions, 
  app: Application | Agent,
): Kmore {

  const opts: ClientOptions = parseOptions(options)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  assert(opts && Object.keys(opts).length, `[egg-${pluginName}] config empty`)

  assert(opts.knexConfig, `[egg-${pluginName}] database connect knexConfig empty`)

  const { connection } = opts.knexConfig


  if (typeof connection === 'string') {
    assert(
      connection,
      '[egg-kmore] database connect string empty',
    )
  }
  else if (typeof connection === 'object') {
    const {
      host, port, user, database,
    } = connection as {host: string, port: number, user: string, database: string}

    assert(
      connection,
      `[egg-kmore] 'host: ${host}', 'port: ${port}', 'user: ${user}', 'database: ${database}'`,
    )

    app.coreLogger.info(
      `[egg-${pluginName}] connecting %s@%s:%s/%s`,
      user,
      host,
      port ? port : '',
      database,
    )
  }
  else {
    assert(false, `[egg-${pluginName}] database connect config are required on config`)
  }

  const client = kmoreFactory({
    config: opts.knexConfig,
    dict: opts.dict,
  })

  if (opts.waitConnected) {
    checkConnected(app, opts.knexConfig, client)
  }
  else {
    count += 1
    app.coreLogger.info(`[egg-${pluginName}] instance[${count}] status OK, `)
  }

  return client
}


function checkConnected(
  app: Application | Agent,
  knexConfig: KnexConfig,
  clientInstInst: Kmore,
): void {

  const { client } = knexConfig
  const checkFlag = !! (client === EnumClient.pg
    || client === EnumClient.mysql
    || client === EnumClient.mysql2)

  if (! checkFlag) {
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.beforeStart(async () => {
    const time = await getCurrentTime(clientInstInst.dbh, client)
    assert(
      time,
      'Should retrieve current time from connecting database, but got invalid.',
    )
    count += 1
    app.coreLogger.info(`[egg-kmore] instance[${count}] status connected, db currentTime: '${time}'`)
  })
}

