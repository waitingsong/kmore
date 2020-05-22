import {
  Config,
  KTables,
  TTables,
} from 'kmore'


/** Config of egg-kmore */
export interface EggKmoreConfig<T extends TTables> {
  /** Start in app worker, Default: true */
  app?: boolean
  /** Start in agent, Default: false */
  agent?: boolean
  default?: Partial<DefaultClientOpts>
  client?: ClientOpts<T>
  clients?: MuiltiClientsOpts<T>
}

export interface DefaultClientOpts {
  waitConnected: boolean
}
export interface ClientOpts<T extends TTables> {
  knexConfig: Config
  kTables: KTables<T>
  waitConnected?: boolean
}
export interface MuiltiClientsOpts<T extends TTables> {
  [db: string]: ClientOpts<T>
}
