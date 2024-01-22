/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import assert from 'node:assert'

import {
  camelToSnake,
  camelKeys,
  snakeKeys,
  snakeToCamel,
} from '@waiting/shared-core'
import { RecordCamelKeys, RecordPascalKeys, RecordSnakeKeys } from '@waiting/shared-types'
// eslint-disable-next-line import/no-extraneous-dependencies
import type { Knex } from 'knex'

import { CaseType, EnumClient, KnexConfig, QueryContext } from './types.js'


export async function getCurrentTime(
  dbh: Knex,
  clientType: KnexConfig['client'],
): Promise<string> {

  if (clientType) {
    const res = await dbh.raw('SELECT CURRENT_TIMESTAMP AS currenttime;')

    switch (clientType) {
      case EnumClient.pg:
      case EnumClient.pgnative:
      case EnumClient.mysql:
        return parseRespCommon(res as RespCommon)

      case EnumClient.mysql2:
        return parseRespMysql2(res as RespMysql2)

      default:
        console.warn(`[Kmore] Unsupported client value: '${clientType.toString()}' for getCurrentTime(). `)
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
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-optional-chain
  return res && res[0] && res[0][0] && res[0][0].currenttime
    ? res[0][0].currenttime
    : ''
}


/**
 * Convert identifier (field) to snakecase
 */
export function wrapIdentifier(
  value: string,
  origImpl: (input: string) => string,
  queryContext?: QueryContext,
): string {

  let ret = ''

  // do not convert if value is add by  builder.columns(columns)
  if (isIdentifierInColumns(value, queryContext?.columns)) {
    ret = origImpl(value)
    return ret
  }

  if (queryContext) {
    switch (queryContext.wrapIdentifierCaseConvert) {
      case CaseType.camel: {
        ret = origImpl(snakeToCamel(value))
        break
      }

      case CaseType.snake: {
        ret = origImpl(camelToSnake(value))
        break
      }

      case CaseType.pascal: {
        throw new TypeError('CaseType.pascal for wrapIdentifierCaseConvert not implemented yet')
      }

      default:
        ret = origImpl(value)
        break
    }
  }
  else {
    ret = origImpl(value)
  }
  if (value === '' && ret === '``') {
    // fix for mysql when identifier is empty string
    // e.g. SELECT '' AS foo => SELECT `` AS foo, will be converted to SELECT '' AS foo
    ret = '\'\''
  }
  return ret
}



export function postProcessResponse<T extends PostProcessInput = PostProcessInput>(
  result: T,
  queryContext?: QueryContext,
): T | PostProcessRespRet<T, QueryContext['postProcessResponseCaseConvert']> {

  if (! queryContext) { return result }

  const caseConvert = queryContext.postProcessResponseCaseConvert
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (! caseConvert) { return result }

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
    const ret = result.map((row: PostProcessPlain | PostProcessRecord) => {
      const data = postProcessResponseToCamel(row, _queryContext)
      return data
    })
    return ret as PostProcessRespRet<T, CaseType.camel>
  }
  else if (typeof result === 'object' && result) {
    const ret = _elementKeyToCamel(result, _queryContext)
    return ret
  }

  return result as PostProcessRespRet<T, CaseType.camel>
}

function _elementKeyToCamel<T extends PostProcessRecord>(
  row: T,
  _queryContext?: QueryContext,
): PostProcessRespRet<T, CaseType.camel> {

  assert(typeof row === 'object' && row, 'row should be object')

  const columns = _queryContext?.columns
  if (! columns) {
    const ret = genCamelKeysFrom(row)
    return ret as PostProcessRespRet<T, CaseType.camel>
  }

  const { resultNotConvertKeys, resultNeedConvertKeys } = genResultKeysData(row, columns)

  const reulst2 = genCamelKeysFrom(resultNeedConvertKeys)
  const ret = Object.assign(resultNotConvertKeys, reulst2)
  return ret as PostProcessRespRet<T, CaseType.camel>
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
    const ret = result.map((row: PostProcessPlain | PostProcessRecord) => {
      const data = postProcessResponseToSnake(row, _queryContext)
      return data
    })
    return ret as PostProcessRespRet<T, CaseType.snake>
  }
  else if (typeof result === 'object' && result) {
    const ret = _elementKeyToSnake(result, _queryContext)
    return ret
  }

  return result as PostProcessRespRet<T, CaseType.snake>
}

function _elementKeyToSnake<T extends PostProcessRecord>(
  row: T,
  _queryContext?: QueryContext,
): PostProcessRespRet<T, CaseType.snake> {

  assert(typeof row === 'object' && row, 'row should be object')

  const columns = _queryContext?.columns
  if (! columns) {
    const ret = genSnakeKeysFrom(row)
    return ret as PostProcessRespRet<T, CaseType.snake>
  }

  const { resultNotConvertKeys, resultNeedConvertKeys } = genResultKeysData(row, columns)

  const reulst2 = genSnakeKeysFrom(resultNeedConvertKeys)
  const ret = Object.assign(resultNotConvertKeys, reulst2)
  return ret as PostProcessRespRet<T, CaseType.snake>
}

function genResultKeysData<T extends PostProcessRecord>(
  row: T,
  columns: Record<string, string>[],
): {
    resultNotConvertKeys: Record<string, unknown>,
    resultNeedConvertKeys: Record<string, unknown>,
  } {

  assert(typeof row === 'object' && row, 'row should be object')

  const resultNotConvertKeys = {}
  const resultNeedConvertKeys = {}

  Object.entries(row).forEach(([key, value]) => {
    // do not convert if value is add by  builder.columns(columns)
    if (isIdentifierInColumns(key, columns)) {
      Object.defineProperty(resultNotConvertKeys, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value,
      })
    }
    else {
      Object.defineProperty(resultNeedConvertKeys, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value,
      })
    }
  })

  return {
    resultNotConvertKeys,
    resultNeedConvertKeys,
  }
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

function isIdentifierInColumns(value: string, columns: Record<string, string>[] | undefined): boolean {
  if (! columns?.length) {
    return false
  }

  const found = columns.some((row) => {
    if (row['fromSmartJoin']) {
      return false
    }
    if (typeof row[value] !== 'undefined' && row[value] !== value) {
      return true
    }
    return false
  })
  return found
}
