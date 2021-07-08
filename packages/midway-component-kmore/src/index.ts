import { DbManager } from './lib/db-man'


export { AutoConfiguration as Configuration } from './configuration'
export { DbManager }
export * from './lib/types'
export { KmoreComponent } from './lib/kmore'
export { TracerKmoreComponent } from './lib/tracer-kmore'
export { unsubscribeEventFuncOnResFinish } from './lib/tracer-helper'

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

