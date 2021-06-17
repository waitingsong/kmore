/* eslint-disable import/no-extraneous-dependencies */
import { IMidwayWebContext as Context } from '@midwayjs/web'
import { Logger } from '@mw-components/jaeger'
import { Kmore } from 'kmore'
import { Knex } from 'knex'

import { DbConfig } from './types'


export class KmoreComponent<D = unknown> extends Kmore<D> {

  constructor(
    public readonly dbConfig: DbConfig<D>,
    public dbh: Knex,
    public ctx?: Context,
    public logger?: Logger,
  ) {
    super(
      dbConfig.config,
      dbConfig.dict,
      dbh,
      Symbol(Date.now()),
    )
  }
}
