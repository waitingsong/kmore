import assert from 'assert'

import type { DecoratorExecutorParamBase, DecoratorMetaDataPayload } from '@mwcp/share'
import { deepmerge } from '@mwcp/share'
import { PropagationType } from 'kmore'

import { initTransactionalOptions } from '##/lib/config.js'
import type { CallerKey, RegisterTrxPropagateOptions } from '##/lib/propagation/trx-status.base.js'
import { genCallerKey } from '##/lib/propagation/trx-status.helper.js'
import { TrxStatusService } from '##/lib/trx-status.service.js'
import { ConfigKey, Msg } from '##/lib/types.js'

import type { DecoratorExecutorOptions, GenDecoratorExecutorOptionsExt, TransactionalArgs } from './transactional.types.js'


export async function genDecoratorExecutorOptionsAsync<T extends object>(
  optionsBase: DecoratorExecutorParamBase<T>,
  optionsExt: GenDecoratorExecutorOptionsExt,
): Promise<DecoratorExecutorOptions> {

  const { mergedDecoratorParam, webContext } = optionsBase

  assert(webContext, 'webContext is undefined')
  assert(webContext.requestContext, 'webContext.requestContext is undefined')

  assert(optionsExt.propagationConfig, Msg.propagationConfigIsUndefined)

  const initArgs = {
    propagationType: PropagationType.REQUIRED,
    propagationOptions: {
      ...initTransactionalOptions,
    },
  }

  const trxStatusSvc = await webContext.requestContext.getAsync(TrxStatusService)
  assert(trxStatusSvc, 'trxStatusSvc is undefined')

  const args = deepmerge.all([
    initArgs,
    mergedDecoratorParam ?? {},
  ]) as DecoratorMetaDataPayload<TransactionalArgs>

  const ret: DecoratorExecutorOptions = {
    ...optionsBase,
    ...optionsExt,
    mergedDecoratorParam: args,
    trxStatusSvc,
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

  assert(mergedDecoratorParam?.propagationOptions, 'mergedDecoratorParam.propagationOptions is undefined')

  const type = mergedDecoratorParam.propagationType
  assert(type, 'propagationType is undefined')

  const { readRowLockLevel, writeRowLockLevel } = mergedDecoratorParam.propagationOptions
  assert(readRowLockLevel, 'readRowLockLevel is undefined')
  assert(writeRowLockLevel, 'writeRowLockLevel is undefined')

  const className = instanceName
  assert(className, 'instance.constructor.name is undefined')

  const opts: RegisterTrxPropagateOptions = {
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
    const prefix = `[@mwcp/${ConfigKey.namespace}] registerPropagation error`
    const msg = ex instanceof Error && ex.message.includes(Msg.insufficientCallstacks)
      ? `${prefix}. ${Msg.insufficientCallstacks}`
      : prefix
    console.error(msg, ex)
    const error = new Error(msg, { cause: ex })
    const key = genCallerKey(opts.className, opts.funcName)
    options.callerKey = key
    throw error
  }
  assert(callerKey, `[@mwcp/${ConfigKey.namespace}] generate callerKey failed`)
}


export async function afterReturn(options: DecoratorExecutorOptions): Promise<void> {
  const { trxStatusSvc, callerKey } = options

  if (! callerKey) { return }
  assert(! options.error, `[@mwcp/${ConfigKey.namespace}] options.error is not undefined in afterAsync().
  It should be handled in after() lifecycle redirect to afterThrow() with errorExt.
  Error: ${options.error?.message}`)

  const tkey = trxStatusSvc.retrieveUniqueTopCallerKey(callerKey)
  if (tkey && tkey === callerKey) {
    // Delay for commit, prevent from method returning Promise or calling Knex builder without `await`!
    // await sleep(0)
    // only top caller can commit
    await trxStatusSvc.trxCommitIfEntryTop(tkey)
  }

}

