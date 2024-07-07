import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { KmoreFactory, type PageRawType } from '##/index.js'
import { initPagingMeta } from '##/lib/proxy.auto-paging.js'
import { countTbUser, deleteRow } from '#@/helper.js'
import { config, dbDict } from '#@/test.config.js'
import type { UserDTO } from '#@/test.model.js'


describe(fileShortPath(import.meta.url), () => {
  const km = KmoreFactory({ config, dict: dbDict })
  const colkeys: (keyof UserDTO)[] = ['uid', 'realName']

  const tables = km.camelTables
  const uid = 2
  const len = 2

  before(() => {
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should autoPaging work with transaction', () => {
    it('normal', async () => {
      const trx = await km.transaction()

      const count0 = await countTbUser(km)
      assert(count0 === 3, `count0: ${count0} != 3`)

      await deleteRow(km, tables, trx, uid)

      const count1 = await countTbUser(km, trx)
      assert(count1 === 2, `before rollback count: ${count1} != 2`)

      const ret0 = await tables.ref_tb_user()
        .transacting(trx)
      validateRet(ret0, len)

      const ret = await tables.ref_tb_user()
        .transacting(trx)
        .autoPaging()
      validatePagerRet(ret, len)

      await trx.rollback()

      const count2 = await countTbUser(km)
      assert(count2 === 3, `after rollback count: ${count2} != 3`)
    })

    it('all', async () => {
      const trx = await km.transaction()

      const count0 = await countTbUser(km)
      assert(count0 === 3, `count0: ${count0} != 3`)

      await deleteRow(km, tables, trx, uid)

      const count1 = await countTbUser(km, trx)
      assert(count1 === 2, `before rollback count: ${count1} != 2`)

      const ret10 = await tables.ref_tb_user()
        .transacting(trx)
        .autoPaging()
      validatePagerRet(ret10, len)

      const ret11 = await tables.ref_tb_user()
        .transacting(trx)
        .autoPaging()
        .then()
      validatePagerRet(ret11, len)

      const ret12 = await tables.ref_tb_user()
        .transacting(trx)
        .autoPaging()
        // .first() // not support first() with autoPaging()
        .then()
      validatePagerRet(ret12, len)

      const ret20 = await tables.ref_tb_user()
        .transacting(trx)
        .autoPaging()
        .select('*')
      validatePagerRet(ret20, len)

      const ret21 = await tables.ref_tb_user()
        .transacting(trx)
        .autoPaging()
        .select('*')
        .then()
      validatePagerRet(ret21, len)

      const ret22 = await tables.ref_tb_user()
        .transacting(trx)
        .select('*')
        .autoPaging()
      validatePagerRet(ret22, len)

      const ret23 = await tables.ref_tb_user()
        .transacting(trx)
        .select('*')
        .autoPaging()
        .then()
      validatePagerRet(ret23, len)

      const count2 = await countTbUser(km)
      assert(count2 === 3, `after rollback count: ${count2} != 3`)

      await trx.rollback()

      const count3 = await countTbUser(km)
      assert(count3 === 3, `after rollback count: ${count3} != 3`)
    })

    it('partial', async () => {
      const trx = await km.transaction()

      await deleteRow(km, tables, trx, uid)

      const ret30 = await tables.ref_tb_user()
        .transacting(trx)
        .autoPaging()
        .select('uid', 'realName')
      validatePagerRetPartial(ret30, colkeys, len)

      const ret31 = await tables.ref_tb_user()
        .transacting(trx)
        .autoPaging()
        .select('uid', 'realName')
        .then()
      validatePagerRetPartial(ret31, colkeys, len)

      const ret32 = await tables.ref_tb_user()
        .transacting(trx)
        .select('uid', 'realName')
        .autoPaging()
      validatePagerRetPartial(ret32, colkeys, len)

      const ret33 = await tables.ref_tb_user()
        .transacting(trx)
        .select('uid', 'realName')
        .autoPaging()
        .then()
      validatePagerRetPartial(ret33, colkeys, len)

      const ret40 = await tables.ref_tb_user()
        .transacting(trx)
        .autoPaging()
        .select(colkeys)
      validatePagerRetPartial(ret40, colkeys, len)

      const ret41 = await tables.ref_tb_user()
        .transacting(trx)
        .autoPaging()
        .select(colkeys)
        .then()
      validatePagerRetPartial(ret41, colkeys, len)

      const ret42 = await tables.ref_tb_user()
        .transacting(trx)
        .select(colkeys)
        .autoPaging()
      validatePagerRetPartial(ret42, colkeys, len)

      const ret43 = await tables.ref_tb_user()
        .transacting(trx)
        .select(colkeys)
        .autoPaging()
        .then()
      validatePagerRetPartial(ret43, colkeys, len)

      await trx.rollback()
    })

    it('where', async () => {
      const trx = await km.transaction()

      await deleteRow(km, tables, trx, uid)

      const ret = await tables.ref_tb_user()
        .transacting(trx)
        .autoPaging()
        .where('uid', uid)
      validatePagerRet(ret, 0)

      await trx.rollback()
    })

    it.skip('smartJoin', async () => {
      const ret = await tables.ref_tb_user()
        .autoPaging()
        .smartJoin(
          'tb_user_ext.uid',
          'tb_user.uid',
        )
        .select('*')
        // .where('tb_user_ext_uid', 1)

      // console.log({ ret })
      assert(ret)
    })

  })
})



function validatePagerRet(input: PageRawType<UserDTO> | undefined, len = 3): void {
  assert(input)

  assert(Object.hasOwn(input, 'total'))
  assert(Object.hasOwn(input, 'page'))
  assert(Object.hasOwn(input, 'pageSize'))

  const { total, page, pageSize } = input
  try {
    assert(typeof total === 'number')
    assert(typeof page === 'number')
    assert(typeof pageSize === 'number')

    assert(pageSize === initPagingMeta.pageSize)
    assert(pageSize > 0)
    assert(total === len)
    assert(Array.isArray(input))
    assert(input.length === len)
    assert(pageSize >= input.length)

    if (len > 0) {
      const [row] = input
      // console.log({ row })
      assert(row)
      assert(row.uid)
      assert(row.name)
    }
  }
  catch (ex) {
    console.error({ total, page, pageSize, rows: input.length })
    throw ex
  }
}

function validatePagerRetPartial(
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
  try {
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
  catch (ex) {
    console.error({ total, page, pageSize, rows: input.length })
    throw ex
  }
}

function validateRet(input: UserDTO[], len = 3): void {
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
  assert(row)
  assert(row.uid)
  assert(row.name)
}

