import type { KmoreEvent, KnexConfig } from './types.js'


export const defaultPropDescriptor: PropertyDescriptor = {
  configurable: false,
  enumerable: true,
  writable: false,
} as const


export const initKmoreEvent: KmoreEvent = {
  dbId: '',
  type: 'unknown',
  identifier: void 0,
  kUid: '',
  queryUid: '',
  trxId: void 0,
  method: '',
  command: void 0,
  data: void 0,
  respRaw: void 0,
  exData: void 0,
  exError: void 0,
  queryBuilder: void 0,
  timestamp: Date.now(),
}

export const initialConfig: Omit<KnexConfig, 'client' | 'connection'> = {
  acquireConnectionTimeout: 60000,
  debug: false,
  pool: { min: 0, max: 30 },
}

