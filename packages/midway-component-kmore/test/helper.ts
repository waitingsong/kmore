/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import assert from 'node:assert/strict'

import type { Kmore, KmoreFactoryOpts } from 'kmore'
import { EnumClient, KmoreFactory, getCurrentTime } from 'kmore'
import type { Knex } from 'knex'


import { dbDict, knexConfig as config } from './config.unittest.js'
import type { Db, UserDO, UserDTO, UserExtDO } from './test.model.js'


type TableName = string

export async function dropTables(dbh: Knex, tbs: readonly TableName[]): Promise<void> {
  for (const tb of tbs) {
    // await dbh.schema.dropTableIfExists(tb).then()
    // eslint-disable-next-line no-await-in-loop
    await dbh.raw(`DROP TABLE IF EXISTS "${tb}" CASCADE;`).then()
  }
}

export async function initDb(): Promise<void> {
  const opts: KmoreFactoryOpts<Db> = {
    config,
    dict: dbDict,
  }
  const km = KmoreFactory(opts)
  await dropTables(km.dbh, Object.values(km.dict.tables))

  // const iso = await getTransactionIsolation(km.dbh)
  // console.log(`transaction_isolation: ${iso}`)
  await setTimeZone(km.dbh, 'Asia/Chongqing') // 'UTC'

  await initTable(km)
  await initUser(km)
  await initUserCamel(km)
  await initUserExt(km)
  await km.dbh.destroy()
}

async function initTable(km: Kmore<Db>): Promise<void> {
  const { dict } = km
  assert(dict.tables && Object.keys(dict.tables).length > 0)


  const time = await getCurrentTime(km.dbh, config.client)
  assert(time)
  // console.info(`CurrentTime: ${time}`)

  const { tables, scoped } = km.dict
  const { tb_user, tb_user_ext } = dict.columns

  await km.dbh.schema
    .createTable(tables.tb_user, (tb) => {
      tb.increments(tb_user.uid).primary()
      tb.string(tb_user.name, 30)
      tb.string(tb_user.real_name, 30)
      tb.timestamp(tb_user.ctime, { useTz: false })
    })
    .createTable(tables.tb_user_ext, (tb) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
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
      tb.decimal(tb_user_ext.salary, 16, 4)
    })
    .catch((err: Error) => {
      assert(false, err.message)
    })

}


async function initUser(km: Kmore<Db>): Promise<void> {
  const { tb_user: tb } = km.refTables
  const { tb_user } = km.dict.columns

  // insert
  await tb()
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
      validateUserRows(rows)
      return rows
    })
    .catch((err: Error) => {
      assert(false, err.message)
    })

}

export function validateUserRows(rows: Partial<UserDO>[]): void {
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

        assert(false, `Should row.uid be 1 or 2, but got ${row.uid}`)
    }
  })
}

async function initUserCamel(km: Kmore<Db>): Promise<void> {
  const { tb_user } = km.camelTables

  // insert
  await tb_user()
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

  await tb_user()
    .select('*')
    .then((rows) => {
      validateUserRowsDTO(rows)
      return rows
    })
    .catch((err: Error) => {
      assert(false, err.message)
    })

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

        assert(false, `Should row.uid be 1 or 2, but got ${row.uid}`)
    }
  })
}

async function initUserExt(km: Kmore<Db>): Promise<void> {
  const { tb_user_ext } = km.refTables

  // insert
  await tb_user_ext()
    .insert([
      { uid: 1, age: 10, address: 'address1', salary: 1000.1234 },
      { uid: 2, age: 10, address: 'address1', salary: '1000.12' },
    ])
    .returning('*')
    .then((rows) => {
      validateUserExtRows(rows)
      return rows
    })
    .catch((err: Error) => {
      assert(false, err.message)
    })

  const countRes = await km.refTables.tb_user_ext().count()
  assert(
    countRes?.[0] && countRes[0]['count'] === '2',
    'Should count be "2"',
  )

  // validate insert result
  await tb_user_ext().select('*')
    .then((rows) => {
      validateUserExtRows(rows)
      return rows
    })
    .catch((err: Error) => {
      assert(false, err.message)
    })

}

export function validateUserExtRows(rows: Partial<UserExtDO>[]): void {
  assert(Array.isArray(rows) && rows.length > 0)

  rows.forEach((row) => {
    assert(row?.uid)

    switch (row.uid) {
      case 1:
        assert(row.age === 10, JSON.stringify(row))
        assert(typeof row.salary === 'string', JSON.stringify(row))
        assert(row.salary === '1000.1234', JSON.stringify(row))
        break

      case 2:
        assert(row.age === 10, JSON.stringify(row))
        assert(typeof row.salary === 'string', JSON.stringify(row))
        assert(row.salary === '1000.1200', JSON.stringify(row))
        break

      default:

        assert(false, `Should row.uid be 1 or 2, but got ${row.uid}`)
    }
  })
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

