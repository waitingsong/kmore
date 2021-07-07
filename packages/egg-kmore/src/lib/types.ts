/* eslint-disable node/no-unpublished-import */
// eslint-disable-next-line import/no-extraneous-dependencies
import { Context } from 'egg'
import { KnexConfig } from 'kmore'
import type { DbDict } from 'kmore-types'


/** KnexConfig of egg-kmore */
export interface KmoreEggConfig<D = unknown> {
  /**
   * Switch for app works, Default: true.
   */
  appWork?: boolean
  /**
   * Switch for agent, Default: false.
   */
  agent?: boolean
  client?: ClientOptions<D>
  clients?: MuiltiClientsOptions<D>
}

export interface ClientOptions<D = unknown> {
  debug?: boolean
  knexConfig: KnexConfig
  dict: DbDict<D>
  waitConnected?: boolean
}
export interface MuiltiClientsOptions<D = unknown> {
  [db: string]: ClientOptions<D>
}

export type EggMiddleware = (ctx: Context, next: () => Promise<void>) => Promise<void>

