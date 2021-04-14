/* eslint-disable import/no-extraneous-dependencies */
import { DbDict } from 'kmore-types'
import { Knex, knex } from 'knex'

import { defaultPropDescriptor } from './config'
import {
  DbQueryBuilder,
  KnexConfig,
} from './types'


export class Kmore<D = unknown> {
  readonly refTables: DbQueryBuilder<D, 'ref_'>

  /**
  * Generics parameter, do NOT access as variable!
  * Use under typescript development only.
  *
  * @example ```ts
  * const km = kmoreFactore<Db>({})
  * type DbModel = typeof km.DbModel
  * type Uid = DbModel['tb_user']['uid']  // equal to number
  * ```
  */
  readonly DbModel: D

  /**
  * Generics parameter, do NOT access as variable!
  * Use under typescript development only.
  *
  * @example ```ts
  * const km = kmoreFactore<Db>({})
  * type Dict = typeof kmore['Dict']
  * type Uid = Dict['columns']['tb_user']['alias']['tbUserUid'] // equal to literal 'tb_user.uid'
  * ```
  */
  readonly Dict: DbDict<D>

  constructor(
    public readonly config: KnexConfig,
    public readonly dict: DbDict<D>,
    public dbh: Knex,
  ) {
    this.refTables = this.createRefTables(dbh, 'ref_')
  }

  private createRefTables(dbh: Knex, prefix: string): DbQueryBuilder<D> {
    const rb = {} as DbQueryBuilder<D>

    Object.keys(this.dict.tables).forEach((refName) => {
      const name = `${prefix}${refName}`
      Object.defineProperty(rb, name, {
        ...defaultPropDescriptor,
        // value: (): QueryBuilderExt<D[keyof D]> => this.extRefTableFnProperty(refName), // must dynamically!!
        value: () => this.extRefTableFnProperty(dbh, refName), // must dynamically!!
      })

      Object.defineProperty(rb[name as keyof typeof rb], 'name', {
        ...defaultPropDescriptor,
        value: name,
      })
    })

    return rb
  }

  private extRefTableFnProperty(
    dbh: Knex,
    refName: string,
  ) {

    const rbTableObj = dbh(refName)
    return rbTableObj
  }
}

export interface KmoreFactoryOpts<D> {
  config: KnexConfig
  dict: DbDict<D>
}

export function kmoreFactory<D>(options: KmoreFactoryOpts<D>): Kmore<D> {
  const dbh: Knex = knex(options.config)
  const km = new Kmore<D>(
    options.config,
    options.dict,
    dbh,
  )
  return km
}

