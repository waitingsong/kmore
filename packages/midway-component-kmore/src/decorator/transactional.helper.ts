import assert from 'node:assert'

import type { DecoratorExecutorParamBase, DecoratorMetaDataPayload } from '@mwcp/share'
import { deepmerge } from '@mwcp/share'
import { genError } from '@waiting/shared-core'
import { PropagationType } from 'kmore'

import { initRowLockOptions } from '##/lib/config.js'
import { genCallerKey } from '##/lib/propagation/trx-status.helper.js'
import type { CallerKey, RegisterTrxPropagateOptions } from '##/lib/propagation/trx-status.types.js'
import type { TrxStatusService } from '##/lib/trx-status.service.js'
import { ConfigKey, Msg } from '##/lib/types.js'

import type { DecoratorExecutorOptions, GenDecoratorExecutorOptionsExt, TransactionalOptions } from './transactional.types.js'


export async function genDecoratorExecutorOptionsAsync<T extends object>(
  optionsBase: DecoratorExecutorParamBase<T>,
  optionsExt: GenDecoratorExecutorOptionsExt,
): Promise<DecoratorExecutorOptions> {

  const { mergedDecoratorParam } = optionsBase

  assert(optionsExt.propagationConfig, Msg.propagationConfigIsUndefined)

  const initArgs: TransactionalOptions = {
    dbSourceName: void 0,
    propagationType: PropagationType.REQUIRED,
    rowLockOptions: {
      ...initRowLockOptions,
    },
  }

  assert(optionsExt.trxStatusSvc, 'genDecoratorExecutorOptionsAsync() optionsExt.trxStatusSvc is undefined')

  const args = deepmerge.all([
    initArgs,
    mergedDecoratorParam ?? {},
  ]) as DecoratorMetaDataPayload<TransactionalOptions>

  const ret: DecoratorExecutorOptions = {
    ...optionsBase,
    ...optionsExt,
    mergedDecoratorParam: args,
  }

  const { dbSourceName } = args
  if (! dbSourceName) {
    const dbInstanceCount = ret.trxStatusSvc.getDbInstanceCount()
    assert(dbInstanceCount <= 1, 'genDecoratorExecutorOptionsAsync(): dbSourceName is undefined, but multiple dbSources found')
  }

  return ret
}

export async function before(options: DecoratorExecutorOptions): Promise<void> {
  const {
    instanceName,
    mergedDecoratorParam,
    methodName,
    trxStatusSvc,
  } = options

  assert(mergedDecoratorParam?.rowLockOptions, 'mergedDecoratorParam.rowLockOptions is undefined')

  const type = mergedDecoratorParam.propagationType
  assert(type, 'propagationType is undefined')

  const { readRowLockLevel, writeRowLockLevel } = mergedDecoratorParam.rowLockOptions
  assert(readRowLockLevel, 'readRowLockLevel is undefined')
  assert(writeRowLockLevel, 'writeRowLockLevel is undefined')

  const className = instanceName
  assert(className, 'instance.constructor.name is undefined')

  const opts: RegisterTrxPropagateOptions = {
    dbSourceName: mergedDecoratorParam.dbSourceName, // can be undefined if only one dbSource
    scope: options.scope,
    type,
    className,
    funcName: methodName,
    readRowLockLevel,
    writeRowLockLevel,
  }
  assert(opts.type, 'opts.type propagationType is undefined')
  assert(opts.readRowLockLevel, 'opts.readRowLockLevel is undefined')
  assert(opts.writeRowLockLevel, 'opts.writeRowLockLevel is undefined')

  let callerKey: CallerKey | undefined = void 0
  try {
    callerKey = trxStatusSvc.registerPropagation(opts)
    options.callerKey = callerKey
  }
  catch (ex) {
    // console.error(msg, ex)
    const error = genError({ error: ex, altMessage: Msg.registerPropagationFailed })
    const key = genCallerKey(opts.className, opts.funcName)
    options.callerKey = key
    options.error = error
    throw error
  }
  assert(callerKey, `[@mwcp/${ConfigKey.namespace}] generate callerKey failed`)
}


export async function afterReturn(options: DecoratorExecutorOptions): Promise<void> {
  const { trxStatusSvc, callerKey, mergedDecoratorParam } = options

  if (! callerKey) { return }
  assert(! options.error, `[@mwcp/${ConfigKey.namespace}] options.error is not undefined in afterAsync().
  It should be handled in after() lifecycle redirect to afterThrow() with errorExt.
  Error: ${options.error?.message}`)

  await trxStatusSvc.tryCommitTrxIfKeyIsEntryTop(mergedDecoratorParam?.dbSourceName, options.scope, callerKey)
}


export function afterThrow(options: DecoratorExecutorOptions, trxStatusService: TrxStatusService): never | Promise<never> {
  const { error } = options
  assert(error instanceof Error, `[@mwcp/${ConfigKey.namespace}] ${ConfigKey.Transactional}() afterThrow error is not instance of Error`)

  const { callerKey, mergedDecoratorParam } = options
  const key = callerKey ?? genCallerKey(options.instanceName, options.methodName)
  const tkey = trxStatusService.retrieveUniqueTopCallerKey(mergedDecoratorParam?.dbSourceName, options.scope, key)

  if (tkey && tkey === key) {
    if (options.methodIsAsyncFunction) {
      return trxStatusService.trxRollbackEntry(mergedDecoratorParam?.dbSourceName, options.scope, key).then(() => {
        throw error
      })
    }
  }
  throw error
}
