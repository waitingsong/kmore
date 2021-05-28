import { DbDict, KnexConfig } from 'kmore'


export type KmoreComponentConfig = Record<string, DbConfig>
export interface DbConfig {
  config: KnexConfig
  dict: DbDict<unknown>
  /**
   * 强制采样请求处理时间（毫秒）阈值
   * 负数不采样
   */
  sampleThrottleMs: number
}
