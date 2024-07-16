import { PropagationType, RowLockLevel } from 'kmore'

import type {
  DbConfig,
  MiddlewareConfig,
  MiddlewareOptions,
  KmorePropagationConfig as PropagationConfig,
  TransactionalOptions,
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
  traceEvent: true,
  traceResponse: true,
}

export const initTransactionalOptions: TransactionalOptions = {
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
  ...initTransactionalOptions,
}

