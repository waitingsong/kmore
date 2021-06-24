import { camelToSnakeCase } from '@waiting/shared-core'
import { RecusiveCamelKeys } from '@waiting/shared-types'
import keysDoToDtoCamel from 'camelcase-keys'
// eslint-disable-next-line import/no-extraneous-dependencies
import { Knex } from 'knex'
import keysDto2DoSnake from 'snakecase-keys'

import { EnumClient, KnexConfig } from './types'


export async function getCurrentTime(
  dbh: Knex,
  clientType: KnexConfig['client'],
): Promise<string> {

  if (typeof clientType === 'string' && clientType) {
    const res = await dbh.raw('SELECT now() AS currenttime;')

    switch (clientType) {
      case EnumClient.pg:
        return parseRespCommon(res)

      case EnumClient.mysql:
        return parseRespCommon(res)

      case EnumClient.mysql2:
        return parseRespMysql2(res)

      default:
        console.warn(`Unsupported client value: '${clientType}' for getCurrentTime().
        Only ${EnumClient.pg}, ${EnumClient.mysql}, ${EnumClient.mysql2} so far. `)
        return ''
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


/**
 * Convert keys of result to camelcase
 */
export function postProcessResponse(
  result: unknown,
  _queryContext: unknown,
): unknown {

  if (Array.isArray(result)) {
    return result.map(row => genCamelKeysFrom(row))
  }
  else {
    return genCamelKeysFrom(result)
  }
}

/**
 * Convert identifier (field) to snakecase
 */
export function wrapIdentifier(
  value: string,
  origImpl: (input: string) => string,
  _queryContext: unknown,
): string {
  return origImpl(camelToSnakeCase(value))
}

export function genCamelKeysFrom<Target extends unknown = unknown, From extends unknown = unknown>(
  input: From,
): unknown extends Target ? RecusiveCamelKeys<Target> : Target {
  // @ts-expect-error
  return keysDoToDtoCamel(input)
}

export function genSnakeKeysFrom<Target extends unknown = unknown, From extends unknown = unknown>(
  input: From,
): Target {
  // @ts-expect-error
  return keysDto2DoSnake(input)
}

