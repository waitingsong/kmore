import assert from 'node:assert'

import { Init, Inject, Singleton } from '@midwayjs/core'

import {
  DbManager,
  Kmore,
} from './types/index.js'
import type { Db2, Db, UserDTO, UserExtDTO } from './types/test.model.js'


@Singleton()
export class UserRepo {

  @Inject() protected readonly dbManager: DbManager<'master', Db>

  protected db: Kmore<Db>

  @Init()
  protected async init(): Promise<void> {
    this.db = this.dbManager.getDataSource('master')
    assert(this.db)
  }

  async user(uid: number): Promise<UserDTO[]> {
    const { tb_user } = this.db.camelTables
    const user = await tb_user()
      .select('*')
      .where({ uid })

    return user
  }

  async userAll(uid: number): Promise<UserExtDTO[]> {
    const db = this.dbManager.getDataSource<Db2>('master')
    const { tb_user_ext } = db.camelTables
    const user = await tb_user_ext()
      .select('*')
      .where({ uid })

    return user
  }

  async userError(): Promise<UserDTO[]> {
    const { tb_user } = this.db.camelTables
    const user = await tb_user()
      .select('fake')

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user
  }

}

