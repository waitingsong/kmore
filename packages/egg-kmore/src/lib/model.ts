import {
  Config,
  DbDict,
  DbModel,
} from 'kmore'


/** Config of egg-kmore */
export interface EggKmoreConfig<D extends DbModel> {
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
export interface ClientOpts<D extends DbModel> {
  knexConfig: Config
  dbDict: DbDict<D>
  waitConnected?: boolean
}
export interface MuiltiClientsOpts<D extends DbModel> {
  [db: string]: ClientOpts<D>
}

