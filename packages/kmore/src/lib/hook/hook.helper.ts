import { trxOnExceptionProcessor } from './exception.hook.js'
import type { HookList } from './hook.types.js'
import { pagingPostProcessor } from './paging.post.hook.js'
import { pagingPreProcessor } from './paging.pre.hook.js'


export const initHookList: HookList = {
  builderPreHooks: [],
  builderPostHooks: [pagingPreProcessor],
  builderTransactingPreHooks: [],
  builderTransactingPostHooks: [],
  responsePreHooks: [pagingPostProcessor],
  exceptionHooks: [trxOnExceptionProcessor],
  transactionPreHooks: [],
  transactionPostHooks: [],
  beforeCommitHooks: [],
  afterCommitHooks: [],
  beforeRollbackHooks: [],
  afterRollbackHooks: [],
}

export function genHookList(input?: Partial<HookList>): HookList {
  const ret: HookList = { ...initHookList }

  if (input) {
    if (input.builderPreHooks) {
      ret.builderPreHooks = input.builderPreHooks
    }

    if (input.builderPostHooks) {
      ret.builderPostHooks = input.builderPostHooks
    }

    if (input.responsePreHooks) {
      ret.responsePreHooks = input.responsePreHooks
    }

    if (input.exceptionHooks) {
      ret.exceptionHooks = input.exceptionHooks
    }

    if (input.transactionPreHooks) {
      ret.transactionPreHooks = input.transactionPreHooks
    }

    if (input.transactionPostHooks) {
      ret.transactionPostHooks = input.transactionPostHooks
    }

    if (input.beforeCommitHooks) {
      ret.beforeCommitHooks = input.beforeCommitHooks
    }

    if (input.afterCommitHooks) {
      ret.afterCommitHooks = input.afterCommitHooks
    }

    if (input.beforeRollbackHooks) {
      ret.beforeRollbackHooks = input.beforeRollbackHooks
    }

    if (input.afterRollbackHooks) {
      ret.afterRollbackHooks = input.afterRollbackHooks
    }

    if (input.builderTransactingPreHooks) {
      ret.builderTransactingPreHooks = input.builderTransactingPreHooks
    }

    if (input.builderTransactingPostHooks) {
      ret.builderTransactingPostHooks = input.builderTransactingPostHooks
    }
  }

  return ret
}

