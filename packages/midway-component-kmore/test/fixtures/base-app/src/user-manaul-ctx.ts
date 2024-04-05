import assert from 'node:assert/strict'

import {
  Controller,
  Get,
  Inject,
  Param,
} from '@midwayjs/core'
import { Context, MConfig } from '@mwcp/share'

import {
  ConfigKey,
  DbManager,
  MiddlewareConfig,
} from '../../../../dist/index.js'
import { Db, Db2, UserDTO, UserExtDTO } from '../../../test.model.js'


@Controller('/user2')
export class User2Controller {

  @MConfig(ConfigKey.middlewareConfig) protected readonly mwConfig: MiddlewareConfig

  @Inject() readonly ctx: Context
  @Inject() dbManager: DbManager<'master', Db>

  @Get('/:id')
  async user(@Param('id') uid: number): Promise<UserDTO[]> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    const { ref_tb_user } = db.camelTables
    const user = await ref_tb_user({ ctx: this.ctx })
      .select('*')
      .where({ uid })

    return user
  }

  @Get('/ext/:id')
  async userAll(@Param('id') uid: number): Promise<UserExtDTO[]> {
    const db = this.dbManager.getDataSource<Db2>('master')
    assert(db)

    const { ref_tb_user_ext } = db.camelTables
    const user = await ref_tb_user_ext({ ctx: this.ctx })
      .select('*')
      .where({ uid })

    return user
  }

  @Get('/error')
  async userError(): Promise<UserDTO[]> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    const { ref_tb_user } = db.camelTables
    const user = await ref_tb_user({ ctx: this.ctx })
      .select('fake')

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user
  }

}

