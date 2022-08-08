
export { AutoConfiguration as Configuration } from './configuration'
export * from './lib/index'
export * from './middleware/db-trx.middleware'
export { getConfigFromApp } from './util/common'


export {
  getCurrentTime,
  Kmore,
  KmoreEvent,
  KnexConfig,
  mergeDoWithInitData,
} from 'kmore'

export type { Knex } from 'knex'

