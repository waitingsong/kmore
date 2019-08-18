/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert'

// eslint-disable-next-line import/no-extraneous-dependencies
import { Agent, Application } from 'egg'
import { kmore } from 'kmore'

import { ClientOpts } from './model'


let count = 0

export default (app: Application | Agent) => {
  app.addSingleton('kmore', createOneClient)
}

function createOneClient(clientOpts: ClientOpts, app: Application | Agent) {
  assert(clientOpts.knexConfig, '[egg-kmore] database connect knexConfig empty')

  const { connection } = clientOpts.knexConfig

  if (typeof connection === 'string') {
    assert(
      connection,
      '[egg-kmore] database connect string empty',
    )
  }
  else if (typeof connection === 'object' && connection) {
    const {
      host, port, user, database,
    } = connection as any

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

  const client = kmore(clientOpts.knexConfig, clientOpts.tables)

  if (clientOpts.waitConnected) {
    app.beforeStart(async () => {
      const { rows } = await client.dbh.raw('SELECT now() AS currentTime;')
      count += 1
      assert(rows && rows[0] && rows[0].currenttime, 'Should retrieve current time from connecting database, but got invalid.')
      app.coreLogger.info(`[egg-kmore] instance[${count}] status connected, db currentTime: ${rows[0].currenttime}`)
    })
  }
  else {
    count += 1
    app.coreLogger.info(`[egg-kmore] instance[${count}] status OK, `)
  }

  return client
}
