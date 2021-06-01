/* eslint-disable import/no-extraneous-dependencies */
import { Provide } from '@midwayjs/decorator'
import {
  Kmore,
  KnexConfig,
} from 'kmore'
import { DbDict } from 'kmore-types'
import { Knex } from 'knex'


@Provide()
export class KmoreComponent<D = unknown> extends Kmore<D> {

  constructor(
    public readonly config: KnexConfig,
    public readonly dict: DbDict<D>,
    public dbh: Knex,
  ) {
    super(
      config,
      dict,
      dbh,
      Symbol(Date.now()),
    )
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
