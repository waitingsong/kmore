import { PropagationType, RowLockLevel } from 'kmore'

import {
  DbConfig,
  MiddlewareConfig,
  MiddlewareOptions,
  KmorePropagationConfig as PropagationConfig,
} from './types'


// export const initialConfig: Readonly<KmoreSourceConfig> = {
//   timeoutWhenDestroy: 10000,
// }

export const initMiddlewareOptions: MiddlewareOptions = {
  debug: false,
}
export const initialMiddlewareConfig: Readonly<Omit<MiddlewareConfig, 'ignore' | 'match' | 'options'>> = {
  enableMiddleware: true,
}


export const initDbConfig: DbConfig = {
  config: {},
  sampleThrottleMs: 3000,
  enableTrace: true,
  traceEvent: true,
  traceResponse: true,
}


export const initPropagationConfig: PropagationConfig = {
  /**
   * @default PropagationType.REQUIRED,
   */
  propagationType: PropagationType.REQUIRED,
  /**
   * @default {@link RowLockLevel.ForShare}
   */
  readRowLockLevel: RowLockLevel.ForShare,
  /**
   * @default {@link RowLockLevel.ForUpdate}
   */
  writeRowLockLevel: RowLockLevel.ForUpdate,
}

