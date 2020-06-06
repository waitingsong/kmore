/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert'

// eslint-disable-next-line import/no-extraneous-dependencies
import { Agent, Application } from 'egg'
import { kmore, TTables, DbModel, Config } from 'kmore'

import { ClientOpts } from './model'


let count = 0

export default (app: Application | Agent): void => {
  app.addSingleton('kmore', createOneClient)
}

function createOneClient<T extends TTables>(
  clientOpts: ClientOpts<T>,
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

  const client = kmore<T>(
    {
      config: clientOpts.knexConfig,
    },
    clientOpts.kTables,
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


function checkConnected<T extends TTables>(
  app: Application | Agent,
  knexConfig: Config,
  clientInstInst: DbModel<T>,
): void {

  const { client } = knexConfig
  const flag = !! (client === 'pg'
    || client === 'mysql'
    || client === 'mysql2')

  if (! flag) {
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.beforeStart(async () => {
    const { rows }: { rows: [{currenttime: string}]}
      = await clientInstInst.dbh.raw('SELECT now() AS currenttime;')
    count += 1
    assert(
      rows[0].currenttime,
      'Should retrieve current time from connecting database, but got invalid.',
    )
    app.coreLogger.info(`[egg-kmore] instance[${count}] status connected, db currentTime: ${rows[0].currenttime}`)
  })
}

