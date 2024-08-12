import type { PropagationType } from './propagation.types.js'


export interface RowLockOptions {
  /**
   * @default ForShare
   */
  readRowLockLevel: RowLockLevel
  /**
   * @default ForUpdate
   */
  writeRowLockLevel: RowLockLevel
}

export interface TrxPropagateOptions extends RowLockOptions {
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
  scope: symbol | object
}

/**
 * Used for `@Transactional()` decorator
 */
export enum RowLockLevel {
  ForShare = 'FOR_SHARE',
  ForUpdate = 'FOR_UPDATE',
  None = 'None',
}

export enum TrxControl {
  Commit = 'commit',
  Rollback = 'rollback',
}

