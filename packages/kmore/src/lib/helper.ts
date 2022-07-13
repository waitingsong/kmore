import {
  camelToSnake,
  camelKeys,
  snakeKeys,
} from '@waiting/shared-core'
import { RecordCamelKeys, RecordSnakeKeys } from '@waiting/shared-types'
// import keysDoToDtoCamel from 'camelcase-keys'
// eslint-disable-next-line import/no-extraneous-dependencies
import type { Knex } from 'knex'
// import keysDto2DoSnake from 'snakecase-keys'

import { EnumClient, KnexConfig } from './types.js'


export async function getCurrentTime(
  dbh: Knex,
  clientType: KnexConfig['client'],
): Promise<string> {

  if (typeof clientType === 'string' && clientType) {
    const res = await dbh.raw('SELECT now() AS currenttime;')

    switch (clientType) {
      case EnumClient.pg:
        return parseRespCommon(res as RespCommon)

      case EnumClient.mysql:
        return parseRespCommon(res as RespCommon)

      case EnumClient.mysql2:
        return parseRespMysql2(res as RespMysql2)

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

export type PostProcessPlain = number | string | undefined | null | boolean
export type PostProcessRecord = Record<string, PostProcessPlain> | object
export type PostProcessArray = PostProcessPlain[]
export type PostProcessInput = PostProcessPlain | PostProcessRecord | PostProcessArray
export type PostProcessRespRet<T extends PostProcessInput> = T extends PostProcessPlain
  ? T
  : T extends PostProcessArray // before PostProcessRecord
    ? PostProcessArray
    : T extends PostProcessRecord
      ? RecordCamelKeys<T>
      : never

/**
 * Convert keys of result to camelcase, if input is object
 */
export function postProcessResponseToCamel<T extends PostProcessInput = PostProcessInput>(
  result: T,
  _queryContext?: unknown,
): PostProcessRespRet<T> {

  if (Array.isArray(result)) {
    const ret = result.map(row => postProcessResponseToCamel(row))
    return ret as PostProcessRespRet<T>
  }
  else if (typeof result === 'object' && result) {
    const ret = genCamelKeysFrom(result)
    return ret as PostProcessRespRet<T>
  }

  return result as PostProcessRespRet<T>
}

export function genCamelKeysFrom<From extends PostProcessRecord>(
  input: From,
): RecordCamelKeys<From, '_'> {

  return camelKeys(input)
}

export function genSnakeKeysFrom<From>(
  input: From,
): RecordSnakeKeys<From, '_'> {

  // return keysDto2DoSnake(input)
  return snakeKeys(input)
}

/**
 * Convert identifier (field) to snakecase
 */
export function wrapIdentifier(
  value: string,
  origImpl: (input: string) => string,
  _queryContext: unknown,
): string {
  return origImpl(camelToSnake(value))
}


/**
 * @description only one level
 */
export function mergeDoWithInitData<T extends Record<string, unknown> | object>(
  initDoData: T,
  input?: Record<string, unknown> | object,
): T {

  if (typeof initDoData !== 'object' || Array.isArray(initDoData)) {
    throw new TypeError('initData not object')
  }

  const ret: T = {
    ...initDoData,
  }

  if (! input || typeof input !== 'object' || ! Object.keys(input).length) {
    return ret
  }

  Object.keys(ret).forEach((key) => {
    // @ts-ignore
    if (Object.hasOwn(input, key) && typeof input[key] !== 'undefined') {
      Object.defineProperty(ret, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        // @ts-ignore
        value: input[key],
      })
    }
  })
  return ret
}
