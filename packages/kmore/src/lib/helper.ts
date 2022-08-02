import {
  camelToSnake,
  camelKeys,
  snakeKeys,
} from '@waiting/shared-core'
import { RecordCamelKeys, RecordPascalKeys, RecordSnakeKeys } from '@waiting/shared-types'
// eslint-disable-next-line import/no-extraneous-dependencies
import type { Knex } from 'knex'

import { CaseType, EnumClient, KnexConfig, QueryContext } from './types.js'


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


export function postProcessResponse<T extends PostProcessInput = PostProcessInput>(
  result: T,
  queryContext?: QueryContext,
): T | PostProcessRespRet<T, QueryContext['caseConvert']> {

  if (! queryContext) {
    return result
  }

  const { caseConvert } = queryContext
  if (! caseConvert) {
    return result
  }

  switch (caseConvert) {
    case CaseType.camel:
      return postProcessResponseToCamel(result, queryContext)
    case CaseType.pascal:
      throw Error('Not implemented yet for pascal case conversion')
      // return postProcessResponseToPascal(result, queryContext)
    case CaseType.snake:
      return postProcessResponseToSnake(result, queryContext)
    default:
      return result
  }
}

export type PostProcessPlain = number | string | undefined | null | boolean
export type PostProcessRecord = Record<string, PostProcessPlain> | object
export type PostProcessArray = PostProcessPlain[]
export type PostProcessInput = PostProcessPlain | PostProcessRecord | PostProcessArray
export type PostProcessRespRet<T extends PostProcessInput, CaseConvert extends CaseType | undefined>
  = T extends PostProcessPlain
    ? T
    : T extends PostProcessArray // condition before PostProcessRecord
      ? PostProcessArray
      : T extends PostProcessRecord // condition after PostProcessArray
        ? PostProcessRecordCaseConvert<T, CaseConvert>
        : never
type PostProcessRecordCaseConvert<T extends PostProcessRecord, CaseConvert extends CaseType | undefined>
  = CaseConvert extends CaseType.camel
    ? RecordCamelKeys<T>
    : CaseConvert extends CaseType.pascal
      ? RecordPascalKeys<T>
      : CaseConvert extends CaseType.snake
        ? RecordSnakeKeys<T>
        : T

/**
 * Convert keys of result to camelcase, if input is object
 */
export function postProcessResponseToCamel<T extends PostProcessInput = PostProcessInput>(
  result: T,
  _queryContext?: QueryContext,
): PostProcessRespRet<T, CaseType.camel> {

  if (Array.isArray(result)) {
    const ret = result.map(row => postProcessResponseToCamel(row, _queryContext))
    return ret as PostProcessRespRet<T, CaseType.camel>
  }
  else if (typeof result === 'object' && result) {
    const ret = genCamelKeysFrom(result)
    return ret as PostProcessRespRet<T, CaseType.camel>
  }

  return result as PostProcessRespRet<T, CaseType.camel>
}

/**
 * Convert keys of result to PascalCase, if input is object
 */
// export function postProcessResponseToPascal<T extends PostProcessInput = PostProcessInput>(
//   result: T,
//   _queryContext?: QueryContext,
// ): PostProcessRespRet<T, CaseType.pascal> {

//   if (Array.isArray(result)) {
//     const ret = result.map(row => postProcessResponseToCamel(row, _queryContext))
//     return ret as PostProcessRespRet<T, CaseType.pascal>
//   }
//   else if (typeof result === 'object' && result) {
//     const ret = genPascalKeysFrom(result)
//     return ret as PostProcessRespRet<T, CaseType.pascal>
//   }

//   return result as PostProcessRespRet<T, CaseType.pascal>
// }

/**
 * Convert keys of result to snake_case, if input is object
 */
export function postProcessResponseToSnake<T extends PostProcessInput = PostProcessInput>(
  result: T,
  _queryContext?: QueryContext,
): PostProcessRespRet<T, CaseType.snake> {

  if (Array.isArray(result)) {
    const ret = result.map(row => postProcessResponseToSnake(row, _queryContext))
    return ret as PostProcessRespRet<T, CaseType.snake>
  }
  else if (typeof result === 'object' && result) {
    const ret = genSnakeKeysFrom(result)
    return ret as PostProcessRespRet<T, CaseType.snake>
  }

  return result as PostProcessRespRet<T, CaseType.snake>
}


export function genCamelKeysFrom<From extends PostProcessRecord>(
  input: From,
): RecordCamelKeys<From, '_'> {
  return camelKeys(input)
}

// function genPascalKeysFrom<From extends PostProcessRecord>(
//   input: From,
// ): RecordPascalKeys<From, '_'> {
//   return pascalCase(input)
// }

export function genSnakeKeysFrom<From extends PostProcessRecord>(
  input: From,
): RecordSnakeKeys<From, '_'> {
  return snakeKeys(input)
}

/**
 * Convert identifier (field) to snakecase
 */
export function wrapIdentifier(
  value: string,
  origImpl: (input: string) => string,
  queryContext?: QueryContext,
): string {

  if (! queryContext
    || ! queryContext.caseConvert
    || queryContext.caseConvert === CaseType.none) {
    return origImpl(value)
  }

  const ret = origImpl(camelToSnake(value))
  return ret
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
