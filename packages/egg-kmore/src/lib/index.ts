/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */
import assert from 'assert'

// eslint-disable-next-line node/no-unpublished-import
import { Agent, Application } from 'egg'
import {
  kmoreFactory,
  Kmore,
  KnexConfig,
  getCurrentTime,
  EnumClient,
} from 'kmore'

import { ClientOpts } from './types'


let count = 0

export default (app: Application | Agent): void => {
  app.addSingleton('kmore', createOneClient)
}

function createOneClient(
  clientOpts: ClientOpts,
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
      port ? port : '',
      database,
    )
  }
  else {
    assert(false, '[egg-kmore] database connect config are required on config')
  }

  const client = kmoreFactory({
    config: clientOpts.knexConfig,
    dict: clientOpts.dict,
  })

  if (clientOpts.waitConnected) {
    checkConnected(app, clientOpts.knexConfig, client)
  }
  else {
    count += 1
    app.coreLogger.info(`[egg-kmore] instance[${count}] status OK, `)
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

