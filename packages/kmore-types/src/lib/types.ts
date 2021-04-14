import { SnakeToCamel, SnakeToPascal } from '@waiting/shared-types'


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
 *     uid: 'uid'
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
 *     uid: "tb_user.uid"
 *     uid: "tb_user.name"
 *   },
 *
 *   tb_user_ext: {},
 * }
 * ```
 */
export type DictScoped<D> = {
  [TbName in keyof D]: ScopedColumns<D[TbName], TbName & string>
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
export type DictAlias<D> = {
  [TbName in keyof D]: AliasColumns<D[TbName], TbName & string>
}


export type Columns<T> = {
  [F in keyof T]: F
}
export type ScopedColumns<T, K extends string> = {
  [F in keyof T]: `${K}.${F & string}`
}
export type AliasColumns<T, K extends string> = {
  [F in keyof T]: Record<`${SnakeToCamel<K>}${SnakeToPascal<F & string>}`, `${K}.${F & string}`>
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
  [F in keyof T as `${SnakeToCamel<K>}${SnakeToPascal<F & string>}`]: T[F]
}

