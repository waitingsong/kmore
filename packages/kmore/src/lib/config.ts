import { KmoreEvent } from './types'


export const defaultPropDescriptor: PropertyDescriptor = {
  configurable: false,
  enumerable: true,
  writable: false,
} as const


export const initKmoreEvent: KmoreEvent = {
  type: 'unknown',
  identifier: void 0,
  queryUid: '',
  data: void 0,
  respRaw: void 0,
  exData: void 0,
  exError: void 0,
}
