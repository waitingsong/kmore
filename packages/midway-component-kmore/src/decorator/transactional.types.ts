import { DecoratorExecutorParamBase } from '@mwcp/share'
import { PropagationType } from 'kmore'

import { CallerKey } from '##/lib/propagation/trx-status.base.js'
import { TrxStatusService } from '##/lib/trx-status.service.js'
import { KmorePropagationConfig, TransactionalOptions } from '##/lib/types.js'


export const TRX_CLASS_KEY = 'decorator:kmore_trx_class_decorator_key'
export const METHOD_KEY_Transactional = 'decorator:kmore_trx_decorator_key'
export const classDecoratorKeyMap = new Map([[TRX_CLASS_KEY, 'Transactional']])
export const methodDecoratorKeyMap = new Map([[METHOD_KEY_Transactional, 'Transactional']])

export type DecoratorExecutorOptions = DecoratorExecutorParamBase<TransactionalArgs>
  & GenDecoratorExecutorOptionsExt
  & {
    trxStatusSvc: TrxStatusService,
    callerKey?: CallerKey | undefined,
  }

export interface GenDecoratorExecutorOptionsExt {
  propagationConfig: KmorePropagationConfig
}


export interface TransactionalArgs {
  /**
   * @default {@link PropagationType.REQUIRED}
   */
  propagationType: PropagationType | undefined
  /**
   * @default {@link TransactionalOptions}
   */
  propagationOptions: Partial<TransactionalOptions> | undefined
}

