import { ConfigKey } from '##/lib/types.js'


export const apiBase = {
  root: '/',
  prefix: `/_${ConfigKey.namespace}`,
  demo: '/demo',

  args: '/args',
  cache: '/cache',
  classDecorator: '/class_decorator',
  classDecoratorDeep: '/class_decorator_deep',
  classDecoratorDeep2: '/class_decorator_deep_2',
  crossClassDecorator: '/cross_class_decorator',
  methodDecorator: '/method_decorator',
  propagationOverride: '/method_propagation_override_class',
  decorator: '/decorator',

  trx_manual: '/trx_manual',
  user: '/user',
  middle_trx_auto_action: '/middle_trx_auto_action',
  trx_error: '/trx_error',
  transactional_simple: '/transactional_simple',
}

export const apiMethod = {
  root: '/',
  hello: 'hello',
  component: 'component',

  get: 'get',
  commit: 'commit',
  rollback: 'rollback',
  delete: 'delete',
  controllerUpdate: 'controller_update',
  controllerUpdateDelOneByOne: 'controller_update_delete_one_by_one',
  returnReject: 'return_reject',
  selfUpdateDel: 'self_update_delete',
  selfReturnMissingAwait: 'self_return_missing_await',
  fast_self_return_missing_await: 'fast_self_return_missing_await',
  selfReturnPromise: 'self_return_promise',
  separateTrx: 'separate_trx',
  sibling: 'sibling',
  simple: 'simple',
  supports: 'supports',
  supports2: 'supports2',
  throwError: 'throw_error',
  update: 'update',
  updateDel: 'update_delete',
  updateDelAll: 'update_delete_all',
  updateDelOneByOne: 'update_delete_one_by_one',
  cacheableWithClassTransactional: 'cacheable_with_class_transactional',
  cacheableAfterMethodTransactional: 'cacheable_after_method_transactional',
  cacheableBeforeMethodTransactional: 'cacheable_before_method_transactional',

  close_early: 'close_early',
  paging: 'paging',
}
