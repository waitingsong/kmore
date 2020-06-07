import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { kmore, DbModel, getCurrentTime, EnumClient } from '../src/index'

import { dropTables } from './helper'
import { config } from './test.config'
import { TbListModel } from './test.model'


const filename = basename(__filename)

describe(filename, () => {
  const db: DbModel<TbListModel> = kmore<TbListModel>({ config })

  before(async () => {
    assert(db.tables && Object.keys(db.tables).length > 0)
    await dropTables(db.dbh, Object.values(db.tables))

    const time = await getCurrentTime(db.dbh, config.client)
    assert(time)
    console.info(`CurrrentTime: ${time}`)
  })

  after(async () => {
    await db.dbh.destroy() // !
  })

  describe('Should create table works', () => {
    it('tb_user and tb_user_detail', async () => {
      await db.dbh.schema
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
    })
  })

})
