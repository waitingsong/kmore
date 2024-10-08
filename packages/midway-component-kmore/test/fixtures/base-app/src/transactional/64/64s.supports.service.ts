import assert from 'node:assert'

import { Init, Inject, Singleton } from '@midwayjs/core'
import { KmoreQueryBuilder, PropagationType, TrxPropagateOptions } from 'kmore'

import {
  DbManager,
  Kmore,
  Transactional,
} from '../../types/index.js'
import type { Db, UserDTO } from '../../types/test.model.js'


@Transactional()
@Singleton()
export class PropagationOverrideService {

  name = 'PropagationOverrideService'

  @Inject() dbManager: DbManager<'master', Db>

  db: Kmore<Db>
  tb_user: Kmore<Db>['camelTables']['tb_user']
  tb_user_ext: Kmore<Db>['camelTables']['tb_user_ext']

  @Init()
  async init(): Promise<void> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    this.db = db
    this.tb_user = db.camelTables.tb_user
    this.tb_user_ext = db.camelTables.tb_user_ext
  }

  async usersAll(): Promise<void> {
    const {
      users,
      trxId,
      trxPropagateOptions,
      trxPropagated,
    } = await this.getUsersWithMethodDecoratorSupports(false)
    assert(users && users.length === 3)
    assert(! trxId)
    assert(trxPropagateOptions)
    assert(trxPropagateOptions.type === PropagationType.SUPPORTS)
    assert(! trxPropagated)

    const {
      users: users2,
      trxId: trxId2,
      trxPropagateOptions: trxPropagateOptions2,
      trxPropagated: trxPropagated2,
    } = await this.getUsers()
    assert(users2 && users2.length === 3)
    assert(trxId2)
    assert(trxPropagateOptions2)
    assert(trxPropagateOptions2.type === PropagationType.REQUIRED)
    assert(trxPropagated2)

    const {
      users: users3,
      trxId: trxId3,
      trxPropagateOptions: trxPropagateOptions3,
      trxPropagated: trxPropagated3,
    } = await this.getUsersWithMethodDecoratorSupports(true)
    assert(users3 && users3.length === 3)
    assert(trxId3)
    assert(trxPropagateOptions3)
    assert(trxPropagateOptions3.type === PropagationType.SUPPORTS)
    assert(trxPropagated3)

    assert(trxId2 === trxId3)
  }

  async getUsers(): Promise<UserRet> {
    const builder = this.tb_user()
    const users = await builder
    const trxId = this.validateBuilderLinkedTrx(builder, true) // must after "await"
    assert(users)

    const { trxPropagateOptions, trxPropagated } = builder
    return { users, trxId, trxPropagateOptions, trxPropagated: !! trxPropagated }
  }

  @Transactional({ propagationType: PropagationType.SUPPORTS })
  async getUsersWithMethodDecoratorSupports(validateTrx: boolean): Promise<UserRet> {
    const builder = this.tb_user()
    const users = await builder
    let trxId
    if (validateTrx) {
      trxId = this.validateBuilderLinkedTrx(builder, validateTrx) // must after "await"
    }
    assert(users)

    const { trxPropagateOptions, trxPropagated } = builder
    return { users, trxId, trxPropagateOptions, trxPropagated: !! trxPropagated }
  }


  protected validateBuilderLinkedTrx(builder: KmoreQueryBuilder<Db>, check: boolean): symbol | undefined {
    const { kmoreQueryId } = builder
    const trx = this.db.getTrxByQueryId(kmoreQueryId)
    if (check) {
      assert(trx, 'trx not found')
      const { kmoreTrxId } = trx
      assert(kmoreTrxId, 'kmoreTrxId not found')
      return kmoreTrxId
    }
    return trx?.kmoreTrxId
  }

}


interface UserRet {
  users: UserDTO[]
  trxId: symbol | undefined
  trxPropagateOptions: TrxPropagateOptions | undefined
  trxPropagated: boolean
}
