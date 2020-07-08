import * as Knex from 'knex'
import * as assert from 'power-assert'

import { kmore, Kmore, getCurrentTime, EnumClient, TableName } from '../src/index'

import { config } from './test.config'
import { User, Db, UserDetail } from './test.model'


export async function dropTables(dbh: Knex, tbs: readonly TableName[]): Promise<void> {
  for await (const tb of tbs) {
    // await dbh.schema.dropTableIfExists(tb).then()
    await dbh.raw(`DROP TABLE IF EXISTS "${tb}" CASCADE;`).then()
  }
}

export async function initDb(): Promise<void> {
  const km: Kmore<Db> = kmore<Db>({ config })
  await dropTables(km.dbh, Object.values(km.tables))

  const iso = await getTransactionIsolation(km.dbh)
  console.log(`transaction_isolation: ${iso}`)
  await setTimeZone(km.dbh, 'Asia/Chongqing') // 'UTC'

  await initTable(km)
  await initUser(km)
  await initUserDetail(km)
  await km.dbh.destroy()
}

async function initTable(km: Kmore<Db>): Promise<void> {
  assert(km.tables && Object.keys(km.tables).length > 0)

  const time = await getCurrentTime(km.dbh, config.client)
  assert(time)
  console.info(`CurrrentTime: ${time}`)

  await km.dbh.schema
    .createTable('tb_user', (tb) => {
      tb.increments('uid').primary()
      tb.string('name', 30)
      tb.timestamp('ctime', { useTz: false })
    })
    .createTable('tb_user_detail', (tb) => {
      config.client === EnumClient.mysql || config.client === EnumClient.mysql2
        ? tb.integer('uid').unsigned().primary()
        : tb.integer('uid').primary()
      tb.foreign('uid')
        .references('tb_user.uid')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      tb.integer('age')
      tb.string('address', 255)
    })
    .catch((err: Error) => {
      assert(false, err.message)
    })

}


async function initUser(km: Kmore<Db>): Promise<void> {
  const { rb } = km
  const { tb_user } = km.rb

  // insert
  await km.rb.tb_user()
    .insert([
      { name: 'user1', ctime: new Date() }, // ms
      { name: 'user2', ctime: 'now()' }, // μs
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

export function validateUserRows(rows: Partial<User>[]): void {
  assert(Array.isArray(rows) && rows.length > 0)

  rows.forEach((row) => {
    assert(row && row.uid)

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

async function initUserDetail(km: Kmore<Db>): Promise<void> {
  const { rb } = km
  const { tb_user_detail } = km.rb

  // insert
  await tb_user_detail()
    .insert([
      { uid: 1, age: 10, address: 'address1' },
      { uid: 2, age: 10, address: 'address1' },
    ])
    .returning('*')
    .then((rows) => {
      validateUserDetailRows(rows)
      return rows
    })
    .catch((err: Error) => {
      assert(false, err.message)
    })

  const countRes = await rb.tb_user_detail().count()
  assert(
    countRes && countRes[0] && countRes[0].count === '2',
    'Should count be "2"',
  )

  // validate insert result
  await km.rb.tb_user_detail().select('*')
    .then((rows) => {
      validateUserDetailRows(rows)
      return rows
    })
    .catch((err: Error) => {
      assert(false, err.message)
    })

}

export function validateUserDetailRows(rows: Partial<UserDetail>[]): void {
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
