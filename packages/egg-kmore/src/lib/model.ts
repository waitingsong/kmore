import {
  Config,
  KTables,
  TTables,
} from 'kmore'


/** Config of egg-kmore */
export interface EggKmoreConfig {
  /** Start in app worker, Default: true */
  app?: boolean
  /** Start in agent, Default: false */
  agent?: boolean
  default?: Partial<DefaultClientOpts>
  client?: ClientOpts
  clients?: MuiltiClientsOpts
}

export interface DefaultClientOpts {
  waitConnected: boolean
}
export interface ClientOpts {
  knexConfig: Config
  kTables: KTables<TTables>
  waitConnected?: boolean
}
export interface MuiltiClientsOpts {
  [db: string]: ClientOpts
}

