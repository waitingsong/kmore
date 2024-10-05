
import { computeCallExpressionToLiteralObj } from '@waiting/shared-types-dev'

import type {
  DictAlias,
  DictCamelAlias,
  DictCamelColumns,
  DictColumns,
  DictScoped,
  DictTables,
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
   *     uid: 'uid'
   *     userName: 'userName'
   *   },
   *
   *   tb_user_ext: {},
   * }
   * ```
   */
  camelColumns: DictCamelColumns<D>

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
  const ret = computeCallExpressionToLiteralObj(needle) as DbDict<D>
  const camelColumns = genCamelColumnsFromCamelAlias(ret.camelAlias)
  Object.defineProperty(ret, 'camelColumns', {
    enumerable: true,
    writable: true,
    value: camelColumns,
  })
  return ret
}

function genCamelColumnsFromCamelAlias<D>(data: DbDict<D>['camelAlias']): DbDict<D>['camelColumns'] {
  const ret = {} as DbDict<D>['camelColumns']
  Object.keys(data).forEach((tbName) => {
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cols = data[tbName]
    if (typeof cols === 'object') {
      Object.defineProperty(ret, tbName, {
        enumerable: true,
        writable: true,
        value: {},
      })

      Object.keys(cols as Record<string, unknown>).forEach((col) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const row = cols[col]
        if (typeof row === 'object') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const firstKey = Object.keys(row)[0]
          if (typeof firstKey === 'string' && firstKey.length > 0) {
            // @ts-ignore
            Object.defineProperty(ret[tbName], firstKey, {
              enumerable: true,
              writable: true,
              value: firstKey,
            })
          }
        }
      })
    }

  })

  return ret
}
