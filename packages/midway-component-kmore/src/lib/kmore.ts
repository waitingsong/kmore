/* eslint-disable import/no-extraneous-dependencies */
import { Provide } from '@midwayjs/decorator'
import {
  DbQueryBuilder,
  Kmore,
  KnexConfig,
} from 'kmore'
import { DbDict } from 'kmore-types'
import { Knex } from 'knex'

import { defaultPropDescriptor } from './config'


@Provide()
export class KmoreComponent<D = unknown> extends Kmore<D> {
  readonly instanceId = Symbol(Date.now())
  readonly refTables: DbQueryBuilder<D, 'ref_'>

  constructor(
    public readonly config: KnexConfig,
    public readonly dict: DbDict<D>,
    public dbh: Knex,
  ) {
    super(config, dict, dbh)
    this.refTables = this.createRefTables(dbh, 'ref_')
  }

  protected createRefTables(dbh: Knex, prefix: string): DbQueryBuilder<D> {
    const rb = {} as DbQueryBuilder<D>

    Object.keys(this.dict.tables).forEach((refName) => {
      const name = `${prefix}${refName}`
      Object.defineProperty(rb, name, {
        ...defaultPropDescriptor,
        value: (identifier?: unknown) => {
          const id = typeof identifier !== 'undefined' ? identifier : this.instanceId
          return this.extRefTableFnProperty(dbh, refName, id)
        }, // must dynamically!!
      })

      Object.defineProperty(rb[name as keyof typeof rb], 'name', {
        ...defaultPropDescriptor,
        value: name,
      })
    })

    return rb
  }

}

export interface KmoreComponentFactoryOpts<D> {
  config: KnexConfig
  dict: DbDict<D>
  dbh: Knex
}

export function kmoreFactory<D>(options: KmoreComponentFactoryOpts<D>): KmoreComponent<D> {
  const km = new KmoreComponent<D>(
    options.config,
    options.dict,
    options.dbh,
  )
  return km
}
