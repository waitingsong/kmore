/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */

import type { DbDict } from 'kmore-types'
import type { Knex } from 'knex'
// eslint-disable-next-line no-duplicate-imports, import/no-named-default
import { default as _knex } from 'knex'

import { CaseType } from './types.js'



export class KmoreQueryBuilder<
  D extends object = any,
  CaseConvert extends CaseType = CaseType,
  EnablePage extends PagingCategory = 0,
> {

  select<TRecord extends object = any, TResult = unknown[]>(...args: Parameters<Knex.Select<TRecord, TResult>>): this {
    void args
    return this
  }

}

