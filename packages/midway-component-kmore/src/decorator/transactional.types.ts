import type { TraceScopeType } from '@mwcp/otel'
import type { DecoratorExecutorParamBase } from '@mwcp/share'
import type { PropagationType, RowLockOptions } from 'kmore'

import type { CallerKey, DbSourceName } from '##/lib/propagation/trx-status.types.js'
import type { TrxStatusService } from '##/lib/trx-status.service.js'
import type { KmorePropagationConfig } from '##/lib/types.js'


export const TRX_CLASS_KEY = 'decorator:kmore_trx_class_decorator_key'
export const METHOD_KEY_Transactional = 'decorator:kmore_trx_decorator_key'
export const classDecoratorKeyMap = new Map([[TRX_CLASS_KEY, 'Transactional']])
export const methodDecoratorKeyMap = new Map([[METHOD_KEY_Transactional, 'Transactional']])

export type DecoratorExecutorOptions = DecoratorExecutorParamBase<TransactionalOptions>
  & GenDecoratorExecutorOptionsExt
  & {
    callerKey?: CallerKey | undefined,
  }

export interface GenDecoratorExecutorOptionsExt {
  propagationConfig: KmorePropagationConfig
  scope: TraceScopeType
  trxStatusSvc: TrxStatusService
}

export interface TransactionalOptions {
  /**
   * If pass undefined, will
   * - use default one
   * - or throw error if multiple dbSources
   */
  dbSourceName: DbSourceName | undefined
  /**
   * @default PropagationType.REQUIRED
   */
  propagationType: PropagationType | undefined
  rowLockOptions: Partial<RowLockOptions> | undefined
}

