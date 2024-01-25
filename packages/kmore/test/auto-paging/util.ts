import assert from 'node:assert/strict'

import { PageRawType } from '##/index.js'
import { initPagingMeta } from '##/lib/proxy.auto-paging.js'
import type { UserDTO } from '#@/test.model.js'


export function validatePageRet(input: PageRawType<UserDTO>, len = 3): void {
  assert(input)

  assert(Object.hasOwn(input, 'total'))
  assert(Object.hasOwn(input, 'page'))
  assert(Object.hasOwn(input, 'pageSize'))

  const { total, page, pageSize } = input
  console.log({ total, page, pageSize, rows: input.length })
  assert(typeof total === 'number')
  assert(typeof page === 'number')
  assert(typeof pageSize === 'number')

  assert(pageSize === initPagingMeta.pageSize)
  assert(pageSize > 0)
  assert(total === len)
  assert(Array.isArray(input))
  assert(input.length === len)
  assert(pageSize >= input.length)

  const [row] = input
  // console.log({ row })
  assert(row)
  assert(row.uid)
  assert(row.name)
}

export function validatePageRetPartial(
  input: PageRawType<Partial<UserDTO>>,
  keys: string[],
  len = 3,
): void {

  assert(input)
  assert(keys)
  assert(keys.length > 0)

  const inputKeys = Object.keys(input)
  /**
   * keyof PagingMeta is not enumerable
   */
  Object.keys(initPagingMeta).forEach((key) => {
    assert(! inputKeys.includes(key))
  })

  const { total, page, pageSize } = input
  console.log({ total, page, pageSize, rows: input.length })
  assert(typeof total === 'number')
  assert(typeof page === 'number')
  assert(typeof pageSize === 'number')

  assert(pageSize === initPagingMeta.pageSize)
  assert(pageSize > 0)
  assert(total === len)
  assert(Array.isArray(input))
  assert(input.length === len)
  assert(pageSize >= input.length)

  const [row] = input
  assert(row)
  const rowKeys = Object.keys(row)
  assert(
    rowKeys.length === keys.length,
    `rowKeys: ${JSON.stringify(rowKeys)}, keys: ${JSON.stringify(keys)}`,
  )
  keys.forEach((key) => {
    assert(rowKeys.includes(key))
  })
}

export function validateRet(input: UserDTO[], len = 3): void {
  assert(input)

  const keys = Object.keys(input)
  /**
   * keyof PagingMeta is not enumerable
   */
  Object.keys(initPagingMeta).forEach((key) => {
    assert(! keys.includes(key))
  })

  assert(Array.isArray(input))
  assert(input.length === len)

  const [row] = input
  // console.log({ row })
  assert(row)
  assert(row.uid)
  assert(row.name)
}


export function validateRowsOrder(input: PageRawType<UserDTO>, ord: 'asc' | 'desc'): void {
  assert(input)
  const len = input.length
  assert(len > 1, 'should input.length > 1')

  input.forEach((row, idx) => {
    const { uid } = row
    if (ord === 'asc') {
      assert(uid === idx + 1)
    }
    else {
      assert(uid === len - idx)
    }
  })

}

export function validateRowsOrderPartial(input: PageRawType<Partial<UserDTO>>, ord: 'asc' | 'desc'): void {
  assert(input)
  const len = input.length
  assert(len > 1, 'should input.length > 1')

  input.forEach((row, idx) => {
    const { uid } = row
    if (ord === 'asc') {
      assert(uid === idx + 1)
    }
    else {
      assert(uid === len - idx)
    }
  })

}
