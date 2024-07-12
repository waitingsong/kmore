import type { SnakeToCamel, SnakeToPascal } from '@waiting/shared-types'


/**
 * kmore.tables, tables dict of the database
 *
 * @example
 * ```ts
 * type {
 *  tb_user: 'tb_user'
 *  tb_user_ext: 'tb_user_ext'
 * }
 * ```
 */
export type DictTables<D> = {
  [TbName in keyof D]: TbName & string
}

/**
 * @returns
 * ```ts
 * type {
 *   tb_user: {
 *     user_id: 'user_id'
 *     name: 'name'
 *   },
 *   tb_user_ext: {},
 * }
 * ```
 */
export type DictColumns<D> = {
  [TbName in keyof D]: Columns<D[TbName]>
}

/**
 * @returns
 * ```ts
 * type {
 *   tb_user: {
 *     userId: 'userId'
 *     name: 'name'
 *   },
 *   tb_user_ext: {},
 * }
 * ```
 */
export type DictCamelColumns<D> = {
  [TbName in keyof D]: CamelColumns<D[TbName]>
}

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
export type DictScoped<D> = {
  [TbName in keyof D]: TbName extends string
    ? ScopedColumns<D[TbName], TbName>
    : never
}

/**
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
// export type DictAlias<D> = {
//   [TbName in keyof D]: TbName extends string
//     ? AliasColumns<D[TbName], TbName >
//     : never
// }
export type DictAlias<D> = {
  [TbName in keyof D]: TbName extends string
    ? {
        [F in keyof D[TbName]]: Record<`${SnakeToCamel<TbName & string>}${SnakeToPascal<F & string>}`, `${TbName}.${F & string}`>
      }
    : never
}


export type DictCamelAlias<D> = {
  [TbName in keyof D]: CamelAliasColumns<D[TbName], TbName & string>
}

export type Columns<T> = {
  [F in keyof T]: F
}
/**
 * ```ts
 * {
 *  uid: 'uid'
 *  userName: 'userName'
 * }
 * ```
 */
export type CamelColumns<T> = {
  [F in keyof T as F extends string ? `${SnakeToCamel<F>}` : never]: F extends string
    ? SnakeToCamel<F>
    : never
}
/**
 * ```ts
 * {
 *  uid: 'tb_user.uid'
 *  user_name: 'tb_user.user_name'
 * }
 * ```
 */
export type ScopedColumns<T, K extends string> = {
  [F in keyof T]: F extends string ? `${K}.${F}` : never
}
/**
 * ```ts
 * {
 *  uid: { tbUserUid: 'tb_user.uid' }
 *  user_name: { tbUserUserName: 'tb_user.user_name' }
 * }
 * ```
 */
export type AliasColumns<T, K extends string> = {
  [F in keyof T]: F extends string
    ? Record<`${SnakeToCamel<K>}${SnakeToPascal<F>}`, `${K}.${F}`>
    : never
}
/**
 * ```ts
 * {
 *  uid: { uid: 'tb_user.uid' }
 *  user_name: { userName: 'tb_user.user_name' }
 * }
 * ```
 */
export type CamelAliasColumns<T, K extends string> = {
  [F in keyof T]: Record<`${SnakeToCamel<F & string>}`, `${K}.${F & string}`>
}


export type TableAlias = string
export type TableColAlias = string
export type TableName = string
export type FieldName = string
export type FilePath = string
export type FileName = string


export type CallerFuncNameSet = Set<CallerFuncName>
/**
 * Name of the function
 * for call expression such as `genDbDict<Db>()`
 */
export type CallerFuncName = string


/**
 * Build tables columns type
 * ```ts
 * type {
 *   tb_user: {
 *     uid: number
 *     name: string
 *     tbUserUid: number
 *     tbUserName: string
 *     'tb_user.uid': number
 *     'tb_user.name': string
 *   },
 *   tb_user_ext: {
 *     ...
 *   }
 * }
 * ```
 */
export type DbDictType<D> = {
  [TbName in keyof D]: TableFieldsType<D, TbName>
}
/**
 * Build table columns type
 * ```ts
 * type {
 *   uid: number
 *   name: string
 *   tbUserUid: number
 *   tbUserName: string
 *   'tb_user.uid': number
 *   'tb_user.name': string
 * }
 * ```
 */
export type TableFieldsType<D, K extends keyof D> =
  ColumnsType<D[K]>
  & ScopedColumnsType<D[K], K & string>
  & AliasColumnsType<D[K], K & string>

/**
 * Build table columns type
 * ```ts
 * type {
 *   uid: number
 *   name: string
 * }
 * ```
 */
export type ColumnsType<T> = {
  [F in keyof T]: T[F]
}
/**
 * Build table scoped columns type
 * ```ts
 * type {
 *   'tb_user.uid': number
 *   'tb_user.name': string
 * }
 * ```
 */
export type ScopedColumnsType<T, K extends string> = {
  [F in keyof T as `${K}.${F & string}`]: T[F]
}
/**
 * Build table alias columns type
 * ```ts
 * type {
 *   tbUserUid: number
 *   tbUserName: string
 * }
 * ```
 */
export type AliasColumnsType<T, K extends string> = {
  [F in keyof T as F extends string ? `${SnakeToCamel<K>}${SnakeToPascal<F>}` : never]: T[F]
}

