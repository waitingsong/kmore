
export { globalCallerFuncNameSet } from 'kmore-types'

export {
  cacheMap,
  initBuildSrcOpts,
  initGenTbListFromTypeOpts,
  initOptions,
} from 'kmore-types'

export enum DbPropKeys {
  'dbh' = 'dbh',
  'tables' = 'tables',
  'refTables' = 'rb',
}

export const defaultPropDescriptor: PropertyDescriptor = {
  configurable: false,
  enumerable: true,
  writable: false,
} as const

