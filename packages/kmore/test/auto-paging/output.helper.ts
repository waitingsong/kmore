import assert from 'node:assert'

import type { PageRawType, PageWrapType, PagingMeta } from '##/index.js'
import type { UserDTO } from '#@/test.model.js'


export function validateOptionsPageWrapRet(input: PageWrapType<UserDTO>, expect: PagingMeta): void {
  assert(input)
  assert(Array.isArray(input.rows))

  assert(expect)
  Object.keys(expect).forEach((key) => {
    assert(Object.hasOwn(input, key))
  })

  const { total, page, pageSize, rows } = input
  assert(typeof total === 'bigint')
  assert(typeof page === 'number')
  assert(typeof pageSize === 'number')

  assert(pageSize === expect.pageSize)
  assert(total === expect.total)
  assert(rows.length <= expect.pageSize)
  assert(rows.length <= expect.total)
}


export function validateOptionsPageRet(input: PageRawType<UserDTO>, expect: PagingMeta): void {
  assert(input)
  assert(Array.isArray(input))

  assert(expect)
  Object.keys(expect).forEach((key) => {
    assert(Object.hasOwn(input, key))
  })

  const { total, page, pageSize } = input
  assert(typeof total === 'bigint')
  assert(typeof page === 'number')
  assert(typeof pageSize === 'number')

  assert(pageSize === expect.pageSize, `pageSize: ${pageSize} !== expect.pageSize: ${expect.pageSize}`)
  assert(total === expect.total, `total: ${total} !== expect.total: ${expect.total}`)
  assert(input.length <= expect.pageSize)
}

