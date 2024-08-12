import { type KmoreFactoryOpts, Kmore } from './kmore.js'


export function KmoreFactory<D extends object>(options: KmoreFactoryOpts<D>): Kmore<D> {
  const km = new Kmore<D>(options)
  return km
}

