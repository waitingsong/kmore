// eslint-disable-next-line import/no-extraneous-dependencies
import * as Knex from 'knex'

import { KnexConfig, EnumClient } from './model'


export async function getCurrentTime(
  dbh: Knex,
  clientType: KnexConfig['client'],
): Promise<string> {

  const res = await dbh.raw('SELECT now() AS currenttime;')

  if (typeof clientType === 'string' && clientType) {
    switch (clientType) {
      case EnumClient.pg:
        return parseRespCommon(res)

      case EnumClient.mysql:
        return parseRespCommon(res)

      case EnumClient.mysql2:
        return parseRespMysql2(res)

      default:
        throw new TypeError(`Unsupported client value: '${clientType}' for getCurrentTime().
        Only ${EnumClient.pg}, ${EnumClient.mysql}, ${EnumClient.mysql2} so far.
        `)
    }
  }
  else {
    throw new TypeError('Value of client is empty or not string')
  }
}

interface RespCommon {
  rows: [{ currenttime: string }]
}
function parseRespCommon(res: RespCommon): string {
  return res.rows[0].currenttime
}

interface RespMysql2 extends Array<unknown> {
  0: [{ currenttime: string }]
  1: unknown
  length: 2
}
function parseRespMysql2(res: RespMysql2): string {
  return res && res[0] && res[0][0] && res[0][0].currenttime
    ? res[0][0].currenttime
    : ''
}

