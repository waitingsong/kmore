import assert from 'assert'

import { DecoratorExecutorParamBase, DecoratorMetaDataPayload, deepmerge } from '@mwcp/share'
import { sleep } from '@waiting/shared-core'
import { PropagationType } from 'kmore'

import { initTransactionalOptions } from '##/lib/config.js'
import { CallerKey, RegisterTrxPropagateOptions } from '##/lib/propagation/trx-status.base.js'
import { genCallerKey } from '##/lib/propagation/trx-status.helper.js'
import { TrxStatusService } from '##/lib/trx-status.service.js'
import { Msg } from '##/lib/types.js'

import { DecoratorExecutorOptions, GenDecoratorExecutorOptionsExt, TransactionalArgs } from './transactional.types.js'


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


export async function decoratorExecutorAsync(options: DecoratorExecutorOptions): Promise<unknown> {
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
  }
  catch (ex) {
    const prefix = '[Kmore]: registerPropagation error'
    const msg = ex instanceof Error && ex.message.includes(Msg.insufficientCallstacks)
      ? `${prefix}. ${Msg.insufficientCallstacks}`
      : prefix
    console.error(msg, ex)
    const error = new Error(msg, { cause: ex })
    const key = genCallerKey(opts.className, opts.funcName)
    await processEx({
      callerKey: key,
      error,
      trxStatusSvc,
    })
  }
  assert(callerKey)

  try {
    const { method, methodArgs } = options
    const resp = await method(...methodArgs)

    const tkey = trxStatusSvc.retrieveUniqueTopCallerKey(callerKey)
    if (! tkey || tkey !== callerKey) {
      return resp
    }
    // Delay for commit, prevent from method returning Promise or calling Knex builder without `await`!
    await sleep(0)
    // only top caller can commit
    await trxStatusSvc.trxCommitIfEntryTop(tkey)
    return resp
  }
  catch (error) {
    await processEx({
      callerKey,
      error,
      trxStatusSvc,
    })
  }
}

interface ProcessExOptions {
  callerKey: CallerKey
  error: unknown
  trxStatusSvc: TrxStatusService
}
async function processEx(options: ProcessExOptions): Promise<never> {
  const { callerKey, trxStatusSvc, error } = options

  const tkey = trxStatusSvc.retrieveUniqueTopCallerKey(callerKey)
  if (! tkey || tkey !== callerKey) {
    throw error
  }

  await trxStatusSvc.trxRollbackEntry(callerKey)
  throw error
}



export function decoratorExecutorSync(options: DecoratorExecutorOptions): unknown {
  const { method, methodArgs } = options
  const resp = method(...methodArgs)
  return resp
}

