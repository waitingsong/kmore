import { DbDict, KnexConfig } from 'kmore'
import { Knex } from 'knex'


export type KmoreComponentConfig <DbId extends string = string> = Record<DbId, DbConfig>
export interface DbConfig <T = unknown> {
  config: KnexConfig
  dict: DbDict<T>
  /**
   * Auto connect when service onReady
   * @default true
   */
  isAutoConnect: boolean
  /**
   * 强制采样请求处理时间（毫秒）阈值
   * 负数不采样
   */
  sampleThrottleMs: number
}

export interface KmoreComponentFactoryOpts<D> {
  dbConfig: DbConfig<D>
  dbId?: string
  instanceId?: string | symbol
  dbh?: Knex
}

