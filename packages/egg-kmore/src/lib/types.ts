import { KnexConfig, DbDict } from 'kmore'


/** KnexConfig of egg-kmore */
export interface EggKmoreConfig<D = unknown> {
  /** Start in app worker, Default: true */
  app?: boolean
  /** Start in agent, Default: false */
  agent?: boolean
  default?: Partial<DefaultClientOpts>
  client?: ClientOpts<D>
  clients?: MuiltiClientsOpts<D>
}

export interface DefaultClientOpts {
  waitConnected: boolean
}
export interface ClientOpts<D = unknown> {
  knexConfig: KnexConfig
  dict: DbDict<D>
  waitConnected?: boolean
}
export interface MuiltiClientsOpts<D = unknown> {
  [db: string]: ClientOpts<D>
}

