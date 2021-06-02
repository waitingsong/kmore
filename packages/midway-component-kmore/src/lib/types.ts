import { DbDict, KnexConfig } from 'kmore'


export type KmoreComponentConfig <DbIds extends string = string> = Record<DbIds, DbConfig>
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
