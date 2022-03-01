
export { AutoConfiguration as Configuration } from './configuration'
export * from './lib/index'
export { getConfigFromApp } from './util/common'

export {
  getCurrentTime,
  Kmore, KmoreEvent, KnexConfig,
  genCamelKeysFrom,
  genSnakeKeysFrom,
  mergeDoWithInitData,
  postProcessResponse,
  wrapIdentifier,
} from 'kmore'

export type { Knex } from 'knex'

