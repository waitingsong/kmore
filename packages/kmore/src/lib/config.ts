
export {
  globalCallerFuncNameSet, KmorePropKeys,
} from 'kmore-types'

export {
  cacheMap,
  initBuildSrcOpts,
  initGenDbDictFromTypeOpts,
  initOptions,
} from 'kmore-types'

export const defaultPropDescriptor: PropertyDescriptor = {
  configurable: false,
  enumerable: true,
  writable: false,
} as const

