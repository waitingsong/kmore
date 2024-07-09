import type { PropagationType } from './propagation.types.js'


export interface TrxPropagateOptions {
  entryKey: string
  key: string
  dbId: string
  type: PropagationType
  path: string
  className: string
  funcName: string
  methodName: string
  line: number
  column: number
  /**
   * @default {@link RowLockLevel.ForShare}
   */
  readRowLockLevel: RowLockLevel
  /**
   * @default {@link RowLockLevel.ForUpdate}
   */
  writeRowLockLevel: RowLockLevel
}

/**
 * Used for `@Transactional()` decorator
 */
export enum RowLockLevel {
  ForShare = 'FOR_SHARE',
  ForUpdate = 'FOR_UPDATE',
  None = 'None',
}


