/* eslint-disable import/no-extraneous-dependencies */
import { Provide } from '@midwayjs/decorator'
import { IMidwayWebContext as Context } from '@midwayjs/web'
import { Kmore } from 'kmore'
import { Knex } from 'knex'

import { DbConfig } from './types'


@Provide()
export class KmoreComponent<D = unknown> extends Kmore<D> {

  constructor(
    public readonly dbConfig: DbConfig<D>,
    public dbh: Knex,
    public ctx?: Context,
  ) {
    super(
      dbConfig.config,
      dbConfig.dict,
      dbh,
      Symbol(Date.now()),
    )
  }
}
