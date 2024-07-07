/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import assert from 'assert'

import { sleep } from '@waiting/shared-core'
import type { Knex } from 'knex'

import type {
  CaseType,
  DbQueryBuilder,
  Kmore,
  KmoreFactoryOpts,
  KmoreTransaction,
} from '##/index.js'
import {
  EnumClient,
  KmoreFactory,
  getCurrentTime,
} from '##/index.js'

import { config, dbDict } from './test.config.js'
import type { Db, UserDo, UserDTO, UserExtDo } from './test.model.js'


type TableName = string

export async function dropTables(dbh: Knex, tbs: readonly TableName[]): Promise<void> {
  for await (const tb of tbs) {
    // await dbh.schema.dropTableIfExists(tb).then()
    await dbh.raw(`DROP TABLE IF EXISTS "${tb}" CASCADE;`).then()
  }
}

export async function initDb(): Promise<void> {
  const opts: KmoreFactoryOpts<Db> = {
    config,
    dict: dbDict,
  }
  const km = KmoreFactory<Db>(opts)
  await dropTables(km.dbh, Object.values(km.dict.tables))

  const iso = await getTransactionIsolation(km.dbh)
  console.log(`transaction_isolation: ${iso}`)
  await setTimeZone(km.dbh, 'Asia/Chongqing') // 'UTC'

  await initTable(km)
  await initUser(km)
  await initUserCamel(km)
  await initUserExt(km)
  await initOrder(km)
  await km.dbh.destroy()

  console.info('initDb() done')
}

async function initTable(km: Kmore<Db>): Promise<void> {
  const { dict } = km
  assert(dict.tables && Object.keys(dict.tables).length > 0)

  const time = await getCurrentTime(km.dbh, config.client)
  assert(time)
  console.info(`CurrentTime: ${time}`)

  const { tables, scoped } = km.dict
  const { tb_user, tb_user_ext, tb_order } = dict.columns

  await km.dbh.schema
    .createTable(tables.tb_user, (tb) => {
      tb.increments(tb_user.uid).primary()
      tb.string(tb_user.name, 30)
      tb.string(tb_user.real_name, 30)
      tb.timestamp(tb_user.ctime, { useTz: false })
    })
    .createTable(tables.tb_user_ext, (tb) => {
      config.client === EnumClient.mysql || config.client === EnumClient.mysql2
        ? tb.integer(tb_user_ext.uid).unsigned()
          .primary()
        : tb.integer(tb_user_ext.uid).primary()
      tb.foreign(tb_user_ext.uid)
        .references(scoped.tb_user.uid) // 'tb_user.uid'
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      tb.integer(tb_user_ext.age)
      tb.string(tb_user_ext.address, 255)
    })
    .createTable(tables.tb_order, (tb) => {
      tb.bigIncrements(tb_order.order_id).primary()
      tb.string(tb_order.order_name, 30)
      tb.integer(tb_order.uid)
      tb.timestamp(tb_order.ctime, { useTz: false })
    })
    .catch((err: Error) => {
      assert(false, err.message)
    })

}


async function initUser(km: Kmore<Db>): Promise<void> {
  const { ref_tb_user } = km.refTables
  const { tb_user } = km.dict.columns

  // insert
  await ref_tb_user()
    .insert([
      { name: 'user1', real_name: 'rn1', ctime: new Date() }, // ms
      {
        [tb_user.name]: 'user2',
        [tb_user.real_name]: 'rn2',
        [tb_user.ctime]: 'now()', // us
      },
    ])
    .returning('*')
    .then((rows) => {
      console.log(JSON.stringify(rows, null, 2))
      validateUserRows(rows)
      return rows
    })
    .catch((err: Error) => {
      assert(false, err.message)
    })

  const query = ref_tb_user().where(tb_user.uid, null)
  const sql = query.toSQL().sql.toUpperCase()
  // console.info({ sql })
  assert(sql.includes('WHERE "UID" IS NULL'))

  await sleep(1000)

}

export function validateUserRows(rows: Partial<UserDo>[]): void {
  assert(Array.isArray(rows) && rows.length > 0)

  rows.forEach((row) => {
    assert(row?.uid)
    assert(typeof row.ctime === 'object')

    switch (row.uid) {
      case 1:
        assert(row.name === 'user1', JSON.stringify(row))
        assert(row.real_name === 'rn1', JSON.stringify(row))
        break

      case 2:
        assert(row.name === 'user2', JSON.stringify(row))
        assert(row.real_name === 'rn2', JSON.stringify(row))
        break

      case 3:
        assert(row.name === 'user3', JSON.stringify(row))
        assert(row.real_name === 'rn3', JSON.stringify(row))
        break

      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        assert(false, `Should row.uid be 1 or 2, but got ${row.uid}`)
    }
  })
}

async function initUserCamel(km: Kmore<Db>): Promise<void> {
  const { ref_tb_user } = km.camelTables

  // insert
  await ref_tb_user()
    .insert([
      {
        name: 'user3',
        realName: 'rn3',
        ctime: new Date(),
      }, // ms
    ])
    .catch((err: Error) => {
      assert(false, err.message)
    })

  await ref_tb_user()
    .select('*')
    .then((rows) => {
      validateUserRowsDTO(rows)
      return rows
    })
    .catch((err: Error) => {
      assert(false, err.message)
    })

  await sleep(1000)
}
export function validateUserRowsDTO(rows: Partial<UserDTO>[]): void {
  assert(Array.isArray(rows) && rows.length > 0)

  rows.forEach((row) => {
    assert(row?.uid)
    assert(typeof row.ctime === 'object')

    switch (row.uid) {
      case 1:
        assert(row.name === 'user1', JSON.stringify(row))
        assert(row.realName === 'rn1', JSON.stringify(row))
        break

      case 2:
        assert(row.name === 'user2', JSON.stringify(row))
        assert(row.realName === 'rn2', JSON.stringify(row))
        break

      case 3:
        assert(row.name === 'user3', JSON.stringify(row))
        assert(row.realName === 'rn3', JSON.stringify(row))
        break

      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        assert(false, `Should row.uid be 1 or 2, but got ${row.uid}`)
    }
  })
}

async function initUserExt(km: Kmore<Db>): Promise<void> {
  const { ref_tb_user_ext } = km.refTables

  // insert
  await ref_tb_user_ext()
    .insert([
      { uid: 1, age: 10, address: 'address1' },
      { uid: 2, age: 10, address: 'address1' },
    ])
    .returning('*')
    .then((rows) => {
      validateUserExtRows(rows)
      return rows
    })
    .catch((err: Error) => {
      assert(false, err.message)
    })

  const countRes = await km.refTables.ref_tb_user_ext().count()
  assert(
    countRes?.[0] && countRes[0]['count'] === '2',
    'Should count be "2"',
  )

  // validate insert result
  await ref_tb_user_ext().select('*')
    .then((rows) => {
      validateUserExtRows(rows)
      return rows
    })
    .catch((err: Error) => {
      assert(false, err.message)
    })

}

export function validateUserExtRows(rows: Partial<UserExtDo>[]): void {
  assert(Array.isArray(rows) && rows.length > 0)

  rows.forEach((row) => {
    assert(row?.uid)

    switch (row.uid) {
      case 1:
        assert(row.age === 10, JSON.stringify(row))
        break

      case 2:
        assert(row.age === 10, JSON.stringify(row))
        break

      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        assert(false, `Should row.uid be 1 or 2, but got ${row.uid}`)
    }
  })
}

async function initOrder(km: Kmore<Db>): Promise<void> {
  const { ref_tb_order } = km.refTables

  // insert
  await ref_tb_order()
    .insert([
      {
        uid: 1,
        order_name: 'order1',
        ctime: 'now()',
      },
      {
        uid: 1,
        order_name: 'order2',
        ctime: 'now()',
      },
    ])
    .returning('*')
    .catch((err: Error) => {
      assert(false, err.message)
    })

  const countRes = await km.refTables.ref_tb_order().count()
  assert(
    countRes?.[0] && countRes[0]['count'] === '2',
    'Should count be "2"',
  )
}


async function getTransactionIsolation(dbh: Knex): Promise<string> {
  return dbh.raw('SHOW TRANSACTION ISOLATION LEVEL')
    .then((rows) => {
      return rows.rows[0] ? rows.rows[0].transaction_isolation : 'N/A'
    })
}

async function setTimeZone(dbh: Knex, zone: string): Promise<string> {
  // available select  pg_timezone_names()
  await dbh.raw(`SET TIME ZONE '${zone}'`)
    .then((rows) => {
      return rows.rows[0] ? rows.rows[0].transaction_isolation : 'N/A'
    })
  return dbh.raw('SHOW TIME ZONE')
    .then((rows) => {
      return rows.rows[0] ? rows.rows[0].TimeZone : 'N/A'
    })
}


export async function deleteRow(
  kmore: Kmore<Db>,
  tables: DbQueryBuilder<unknown, Db, 'ref_', CaseType.camel>,
  trx: KmoreTransaction,
  uid: number,
): Promise<void> {

  const countRes = await kmore.refTables.ref_tb_user().transacting(trx).count()
  const count = countRes[0]?.['count']
    ? +countRes[0]['count']
    : 0
  assert(count > 0)

  const rowExists = await tables.ref_tb_user()
    .transacting(trx)
    .select('*')
    .where({ uid })
    .first()
  assert(rowExists, `rowExists is null, uid: ${uid}`)

  const affectedRows = await tables.ref_tb_user()
    .transacting(trx)
    .where({ uid })
    .del('*')

  assert(affectedRows, 'affectedRows is null')
  assert(Array.isArray(affectedRows) && affectedRows.length > 0, 'affectedRows is empty')

  const [affectedRow] = affectedRows
  assert(affectedRow, 'affectedRow is null')
  assert(affectedRow?.uid === uid)
  assert(affectedRow?.realName)

  const countRes2 = await kmore.refTables.ref_tb_user().transacting(trx).count()
  const count2 = countRes2[0]?.['count']
    ? +countRes2[0]['count']
    : 0
  assert(count2 === count - 1)
}

export async function countTbUser(
  kmore: Kmore<Db>,
  trx?: KmoreTransaction,
): Promise<number> {

  const countRes = trx
    ? await kmore.refTables.ref_tb_user().transacting(trx).count()
    : await kmore.refTables.ref_tb_user().count()
  const count = countRes[0]?.['count']
    ? +countRes[0]['count']
    : 0
  return count
}

