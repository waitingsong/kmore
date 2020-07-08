/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert'

// eslint-disable-next-line import/no-extraneous-dependencies
import { Agent, Application } from 'egg'
import {
  kmore,
  DbModel,
  Kmore,
  Config,
  getCurrentTime,
  EnumClient,
} from 'kmore'

import { ClientOpts } from './model'


let count = 0

export default (app: Application | Agent): void => {
  app.addSingleton('kmore', createOneClient)
}

function createOneClient<D extends DbModel>(
  clientOpts: ClientOpts<D>,
  app: Application | Agent,
) {

  assert(clientOpts.knexConfig, '[egg-kmore] database connect knexConfig empty')

  const { connection } = clientOpts.knexConfig

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
      '[egg-kmore] connecting %s@%s:%s/%s',
      user,
      host,
      port,
      database,
    )
  }
  else {
    assert(false, '[egg-kmore] database connect config are required on config')
  }

  const client = kmore<D>(
    {
      config: clientOpts.knexConfig,
    },
    clientOpts.dbDict,
  )

  if (clientOpts.waitConnected) {
    checkConnected(app, clientOpts.knexConfig, client)
  }
  else {
    count += 1
    app.coreLogger.info(`[egg-kmore] instance[${count}] status OK, `)
  }

  return client
}


function checkConnected<T extends DbModel>(
  app: Application | Agent,
  knexConfig: Config,
  clientInstInst: Kmore<T>,
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

