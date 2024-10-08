import assert from 'node:assert'

import type { Kmore, KmoreQueryBuilder, KmoreTransaction } from '##/index.js'
import type { Db } from '#@/test.model.js'


export async function updateWithoutTrx(
  km: Kmore<Db>,
  date: Date,
): Promise<string> {

  const str = await km.camelTables.tb_user()
    .forUpdate()
    .update({ ctime: date })
    .where('uid', 1)
    .returning('ctime')
    .then(rows => rows?.[0]?.ctime as Date)
    .then(ctime => ctime.toLocaleDateString())

  return str
}

export async function update(
  km: Kmore<Db>,
  trx: KmoreTransaction,
  date: Date,
): Promise<string> {

  const str = await km.camelTables.tb_user()
    .transacting(trx)
    .forUpdate()
    .update({ ctime: date })
    .where('uid', 1)
    .returning('ctime')
    .then(rows => rows?.[0]?.ctime as Date)
    .then(ctime => ctime?.toLocaleDateString())

  return str
}


export function readWithoutThen(
  km: Kmore<Db>,
  trx?: KmoreTransaction,
): KmoreQueryBuilder {

  const builder = trx
    ? km.camelTables.tb_user().transacting(trx)
    : km.camelTables.tb_user()

  const data = builder
    .first().where('uid', 1)

  assert(data, 'Should have data')
  return data as unknown as KmoreQueryBuilder
}

export async function read(
  km: Kmore<Db>,
  trx?: KmoreTransaction,
): Promise<string> {

  const builder = trx
    ? km.camelTables.tb_user().transacting(trx)
    : km.camelTables.tb_user()

  const str = await builder
    .first().where('uid', 1)
    .then((row) => {
      return row?.ctime
    })
    .then((ctime) => {
      return (ctime as Date)?.toLocaleDateString()
    })
    .then((data) => {
      // void data
      // throw new Error('foo')
      return data
    })
    // .catch((ex) => {
    //   void ex
    //   throw ex
    // })

  return str
}

export function readInvalid(
  km: Kmore<Db>,
  trx?: KmoreTransaction,
): KmoreQueryBuilder {

  const builder = trx
    ? km.camelTables.tb_user().transacting(trx)
    : km.camelTables.tb_user()
  const b2 = builder.forUpdate()
    .select('*')
    .where('fake', 1)
  return b2 as unknown as KmoreQueryBuilder
}

export async function restore(
  km: Kmore<Db>,
  date: Date,
): Promise<void> {

  await km.camelTables.tb_user()
    .update({ ctime: date })
    .where('uid', 1)
}

