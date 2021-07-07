/* eslint-disable import/no-extraneous-dependencies */
import { ILogger } from '@midwayjs/logger'
import { Kmore } from 'kmore'
import { Knex } from 'knex'

import { DbConfig } from './types'

import { Context } from '~/interface'


export class KmoreComponent<D = unknown> extends Kmore<D> {

  constructor(
    public readonly dbConfig: DbConfig<D>,
    public dbh: Knex,
    public ctx: Context,
    public logger?: ILogger,
  ) {
    super(
      dbConfig.config,
      dbConfig.dict,
      dbh,
      Symbol(Date.now()),
    )
  }
}
