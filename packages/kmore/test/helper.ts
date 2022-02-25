import assert from 'assert/strict'
import { Knex } from 'knex'

import { kmoreFactory, Kmore, getCurrentTime, EnumClient } from '../src/index'

import { config, dbDict } from './test.config'
import { Db, UserDo, UserExtDo } from './test.model'


type TableName = string

export async function dropTables(dbh: Knex, tbs: readonly TableName[]): Promise<void> {
  for await (const tb of tbs) {
    // await dbh.schema.dropTableIfExists(tb).then()
    await dbh.raw(`DROP TABLE IF EXISTS "${tb}" CASCADE;`).then()
  }
}

export async function initDb(): Promise<void> {
  const km = kmoreFactory({ config, dict: dbDict })
  await dropTables(km.dbh, Object.values(km.dict.tables))

  const iso = await getTransactionIsolation(km.dbh)
  console.log(`transaction_isolation: ${iso}`)
  await setTimeZone(km.dbh, 'Asia/Chongqing') // 'UTC'

  await initTable(km)
  await initUser(km)
  await initUserExt(km)
  await km.dbh.destroy()
}

async function initTable(km: Kmore<Db>): Promise<void> {
  const { dict } = km
  assert(dict.tables && Object.keys(dict.tables).length > 0)

  const time = await getCurrentTime(km.dbh, config.client)
  assert(time)
  console.info(`CurrrentTime: ${time}`)

  const { tables, scoped } = km.dict
  const { tb_user, tb_user_ext } = dict.columns

  await km.dbh.schema
    .createTable(tables.tb_user, (tb) => {
      tb.increments(tb_user.uid).primary()
      tb.string(tb_user.name, 30)
      tb.timestamp(tb_user.ctime, { useTz: false })
    })
    .createTable(tables.tb_user_ext, (tb) => {
      config.client === EnumClient.mysql || config.client === EnumClient.mysql2
        ? tb.integer(tb_user_ext.uid).unsigned().primary()
        : tb.integer(tb_user_ext.uid).primary()
      tb.foreign(tb_user_ext.uid)
        .references(scoped.tb_user.uid) // 'tb_user.uid'
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      tb.integer(tb_user_ext.age)
      tb.string(tb_user_ext.address, 255)
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
      { name: 'user1', ctime: new Date() }, // ms
      // { name: 'user2', ctime: 'now()' }, // μs
      {
        [tb_user.name]: 'user2',
        [tb_user.ctime]: 'now()', // us
      },
    ])
    .returning('*')
    .then((rows) => {
      validateUserRows(rows)
      return rows
    })
    .catch((err: Error) => {
      assert(false, err.message)
    })

}

export function validateUserRows(rows: Partial<UserDo>[]): void {
  assert(Array.isArray(rows) && rows.length > 0)

  rows.forEach((row) => {
    assert(row && row.uid)
    assert(typeof row.ctime === 'object')

    switch (row.uid) {
      case 1:
        assert(row.name === 'user1', JSON.stringify(row))
        break
      case 2:
        assert(row.name === 'user2', JSON.stringify(row))
        break
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        assert(false, `Should row.uid be 1 or 2, but got ${row.uid}`)
        break
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
    countRes && countRes[0] && countRes[0].count === '2',
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
    assert(row && row.uid)

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
        break
    }
  })
}


async function getTransactionIsolation(dbh: Kmore['dbh']): Promise<string> {
  return await dbh.raw('SHOW TRANSACTION ISOLATION LEVEL')
    .then((rows) => {
      return rows.rows[0] ? rows.rows[0].transaction_isolation : 'N/A'
    })
}

async function setTimeZone(dbh: Kmore['dbh'], zone: string): Promise<string> {
  // available select  pg_timezone_names()
  await dbh.raw(`SET TIME ZONE '${zone}'`)
    .then((rows) => {
      return rows.rows[0] ? rows.rows[0].transaction_isolation : 'N/A'
    })
  return await dbh.raw('SHOW TIME ZONE')
    .then((rows) => {
      return rows.rows[0] ? rows.rows[0].TimeZone : 'N/A'
    })
}

