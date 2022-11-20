/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Context } from '@mwcp/share'
import {
  CaseType,
  DbQueryBuilder,
} from 'kmore'


export enum BuilderKeys {
  'transacting' = 'transacting',
  transaction = 'transaction',
  _ctxBuilderPreProcessor = '_ctxBuilderPreProcessor',
}

export const refTableKeys = new Set<PropertyKey>([
  'camelTables',
  'refTables',
  'snakeTables',
  'pascalTables',
])
export const knexKeys = new Set<string>([BuilderKeys.transaction])
export const builderKeys = new Set<PropertyKey>([BuilderKeys.transacting])

export type Dbqb = DbQueryBuilder<Context, any, string, CaseType>

