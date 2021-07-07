import { Kmore } from 'kmore'
import { Knex } from 'knex'

import { DbConfig } from './types'

import { Context } from '~/interface'


export class KmoreComponent<D = unknown> extends Kmore<D> {

  constructor(
    public readonly dbConfig: DbConfig<D>,
    public dbh: Knex,
    protected ctx: Context,
  ) {
    super(
      dbConfig.config,
      dbConfig.dict,
      dbh,
      Symbol(Date.now()),
    )
  }
}
