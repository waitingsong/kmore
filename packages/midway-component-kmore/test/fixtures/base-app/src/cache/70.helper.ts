import assert from 'node:assert'

import {
  CachedResponse,
  CacheConfigKey as ConfigKey,
  DataWithCacheMeta,
} from '@mwcp/cache'


export function validateMeta(
  resp: CachedResponse<unknown> | DataWithCacheMeta,
  cacheKey: string,
  ttl: number,
): void {

  assert(resp, 'resp is undefined')
  assert(cacheKey, 'cacheKey is undefined')

  // @ts-ignore
  const meta = resp[ConfigKey.CacheMetaType]
  assert(meta, 'CacheMetaType is undefined')
  assert(meta.cacheKey === cacheKey, meta.cacheKey)
  assert(meta.ttl === ttl, JSON.stringify({ metaTTL: meta.ttl, ttl }))
}

