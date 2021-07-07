import { DbManager } from './lib/db-man'


export { AutoConfiguration as Configuration } from './configuration'
export { DbManager }
export * from './lib/types'
export type { KmoreComponent } from './lib/kmore'
export type { TracerKmoreComponent } from './lib/tracer-kmore'

export {
  DbDict,
  getCurrentTime,
  Kmore, KmoreEvent, KnexConfig,
  genCamelKeysFrom,
  genSnakeKeysFrom,
  mergeDoWithInitData,
  postProcessResponse,
  wrapIdentifier,
} from 'kmore'

export type { Knex } from 'knex'

