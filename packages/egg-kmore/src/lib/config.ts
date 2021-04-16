import { KmoreEggConfig, ClientOptions } from './types'


export const pluginName = 'kmore'
export const middlewareName = 'kmore'

export const initialClientOptions: Readonly<ClientOptions> = {
  debug: false,
  knexConfig: {},
  dict: {
    tables: {},
    columns: {},
    scoped: {},
    alias: {},
  },
  waitConnected: true,
}

export const initialEggConfig: Readonly<KmoreEggConfig> = {
  appWork: true,
  agent: false,
}


/**
 * egg-kmore default config
 * @member Config#kmore
 */
export const kmore: KmoreEggConfig = {
  appWork: true,
  agent: false,
  // client: master,
  // clients: {
  //   master,
  //   slave,
  // },
}

