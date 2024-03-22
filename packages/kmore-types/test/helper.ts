import { Knex } from 'knex'

import { TableName } from '../src/index.js'


export async function dropTables(dbh: Knex, tbs: readonly TableName[]): Promise<void> {
  for (const tb of tbs) {
    // eslint-disable-next-line no-await-in-loop
    await dbh.raw(`DROP TABLE IF EXISTS "${tb}" CASCADE;`).then()
  }
}

