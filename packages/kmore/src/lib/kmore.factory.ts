import { Kmore } from './kmore.js'
import type { KmoreFactoryOpts } from './types.js'


export function KmoreFactory<D extends object, Ctx = unknown>(options: KmoreFactoryOpts<D, Ctx>): Kmore<D, Ctx> {
  const km = new Kmore<D, Ctx>(options)
  return km
}

