
export {
  globalCallerFuncNameSet, DbPropKeys,
} from 'kmore-types'

export {
  cacheMap,
  initBuildSrcOpts,
  initGenTbListFromTypeOpts,
  initOptions,
} from 'kmore-types'

export const defaultPropDescriptor: PropertyDescriptor = {
  configurable: false,
  enumerable: true,
  writable: false,
} as const

