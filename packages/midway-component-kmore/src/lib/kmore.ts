import { Kmore } from 'kmore'
import { Knex } from 'knex'

import { DbManager } from './db-man'
import { DbConfig } from './types'

import { Context } from '~/interface'


export class KmoreComponent<D = unknown> extends Kmore<D> {

  constructor(
    public readonly dbConfig: DbConfig<D>,
    public dbh: Knex,
    protected ctx: Context,
    protected dbMan: DbManager,
  ) {
    super(
      dbConfig.config,
      dbConfig.dict,
      dbh,
      Symbol(Date.now()),
    )
  }
}
