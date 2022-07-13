/* eslint-disable node/no-unpublished-import */
// eslint-disable-next-line import/no-extraneous-dependencies
import { computeCallExpressionToLiteralObj } from '@waiting/shared-types-dev'

import {
  DictTables,
  DictColumns,
  DictAlias,
  DictScoped,
  DictCamelAlias,
} from './types.js'


export interface DbDict<D> {
  /**
   * ```ts
   * type {
   *  tb_user: 'tb_user'
   *  tb_user_ext: 'tb_user_ext'
   * }
   * ```
   */
  tables: DictTables<D>

  /**
   * @returns
   * ```ts
   * type {
   *   tb_user: {
   *     uid: 'uid'
   *     name: 'name'
   *   },
   *
   *   tb_user_ext: {},
   * }
   * ```
   */
  columns: DictColumns<D>

  /**
   * @returns
   * ```ts
   * type {
   *   tb_user: {
   *     uid: "tb_user.uid"
   *     uid: "tb_user.name"
   *   },
   *
   *   tb_user_ext: {},
   * }
   * ```
   */
  scoped: DictScoped<D>

  /**
   * Keyof of Record prefix with table name as
   * @returns
   * ```ts
   * type {
   *   tb_user: {
   *     uid: { tbUserUid: "tb_user.uid" }
   *     name: { tbUserName: "tb_user.name" }
   *   },
   *   tb_user_ext: {},
   * }
   * ```
   */
  alias: DictAlias<D>

  /**
   * Keyof of Record prefix without table name as
   * @returns
   * ```ts
   * type {
   *   tb_user: {
   *     uid: { uid: "tb_user.uid" }
   *     name: { name: "tb_user.name" }
   *     real_name: { realName: "tb_user.real_name" }
   *   },
   *   tb_user_ext: {},
   * }
   * ```
   */
  camelAlias: DictCamelAlias<D>
}


/**
 * Transformer needle.
 * Should running expression only under development.
 * Will be transformed to js literal object in js file under production
 */
export function genDbDict<D>(): DbDict<D> {
  const needle = 'genDbDict'
  const ret = computeCallExpressionToLiteralObj(needle)
  return ret as DbDict<D>
}

