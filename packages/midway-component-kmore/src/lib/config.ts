import type { RowLockOptions } from 'kmore'
import { PropagationType, RowLockLevel } from 'kmore'

import type {
  DbConfig,
  KmorePropagationConfig as PropagationConfig,
  MiddlewareConfig,
  MiddlewareOptions,
} from './types.js'


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
  traceInitConnection: false,
  traceEvents: 'all',
}

export const initRowLockOptions: RowLockOptions = {
  /**
   * @default {@link RowLockLevel.ForShare}
   */
  readRowLockLevel: RowLockLevel.ForShare,
  /**
   * @default {@link RowLockLevel.ForUpdate}
   */
  writeRowLockLevel: RowLockLevel.ForUpdate,
}

export const initPropagationConfig: PropagationConfig = {
  /**
   * @default PropagationType.REQUIRED,
   */
  propagationType: PropagationType.REQUIRED,
  ...initRowLockOptions,
}

