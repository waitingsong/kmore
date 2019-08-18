import { EggKmoreConfig, DefaultClientOpts } from '../lib/model'


export const defaultClientOpts: DefaultClientOpts = {
  waitConnected: true,
}

/**
 * egg-kmore default config
 * @member Config#kmore
 */
export const kmore: EggKmoreConfig = {
  app: true,
  agent: false,
  // client: master,
  // clients: {
  //   master,
  //   slave,
  // },
  default: defaultClientOpts,
}
