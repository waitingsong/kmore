// @ts-nocheck

/**
 * @description only one level
 */
export function mergeDoWithInitData<T>(initDoData: T, input?: Partial<T>): T {
  const ret = {
    ...initDoData,
  } as T

  if (typeof initDoData !== 'object' || Array.isArray(initDoData)) {
    throw new TypeError('initData not object')
  }
  if (! input || ! Object.keys(input).length) {
    return ret
  }

  Object.keys(ret).forEach((key) => {
    if (key in input && typeof input[key] !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      ret[key] = input[key]
    }
  })
  return ret
}

