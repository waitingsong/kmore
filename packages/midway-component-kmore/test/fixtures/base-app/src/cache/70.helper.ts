/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import assert from 'node:assert'

import {
  CachedResponse,
  CacheConfigKey as ConfigKey,
  DataWithCacheMeta,
} from '@mwcp/cache'


export function validateMeta(
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  resp: CachedResponse<unknown> | DataWithCacheMeta,
  cacheKey: string,
  ttl: number,
): void {

  assert(resp, 'resp is undefined')
  assert(cacheKey, 'cacheKey is undefined')

  // @ts-ignore
  const meta = resp[ConfigKey.CacheMetaType]
  assert(meta, 'CacheMetaType is undefined')
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  assert(meta.cacheKey === cacheKey, meta.cacheKey)
  assert(meta.ttl === ttl, JSON.stringify({ metaTTL: meta.ttl, ttl }))
}

