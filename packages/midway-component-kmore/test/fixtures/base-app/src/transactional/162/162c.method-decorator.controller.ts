import assert from 'node:assert'

import { Controller, Get, Inject } from '@midwayjs/core'
import type { Context } from '@mwcp/share'

import { apiBase as apiPrefix, apiMethod as apiRoute } from '../../types/api-test.js'
import { Msg, Transactional } from '../../types/index.js'

import { UserService } from './162s.method-decorator.service.js'


@Controller(apiPrefix.methodDecorator)
export class TrxDecoratorController {

  @Inject() readonly ctx: Context
  @Inject() readonly userSvc: UserService

  @Transactional()
  @Get(`/${apiRoute.controllerUpdate}`)
  async controllerUpdate(): Promise<'OK'> {
    await this.userSvc.userAllWithUpdate()
    return 'OK'
  }

  @Get(`/${apiRoute.separateTrx}`)
  async serial(): Promise<'OK'> {
    await this.userSvc.getUsers()
    await this.userSvc.getUsers2()
    return 'OK'
  }

  @Get(`/${apiRoute.sibling}`)
  async sibling(): Promise<'OK'> {
    await this.userSvc.userAll()
    return 'OK'
  }

  @Get(`/${apiRoute.update}`)
  async update(): Promise<'OK'> {
    await this.userSvc.userAllWithUpdate()
    return 'OK'
  }

  @Get(`/${apiRoute.updateDel}`)
  async updateDel(): Promise<'OK'> {
    await this.userSvc.userUpdateDel(1, 3, 3)
    return 'OK'
  }

  @Get(`/${apiRoute.updateDelOneByOne}`)
  async siblingUpdateDelOneByOne(): Promise<'OK'> {
    await this.userSvc.userUpdateDel(1, 3, 3)
    await this.userSvc.userUpdateDel(2, 2, 2)
    await this.userSvc.userUpdateDel(3, 1, 1)
    return 'OK'
  }

  @Transactional()
  @Get(`/${apiRoute.controllerUpdateDelOneByOne}`)
  async controllerSiblingUpdateDelOneByOne(): Promise<'OK'> {
    await this.userSvc.userUpdateDel(1, 3, 3)
    await this.userSvc.userUpdateDel(2, 2, 3)
    await this.userSvc.userUpdateDel(3, 1, 3)
    return 'OK'
  }

  @Get(`/${apiRoute.updateDelAll}`)
  async updateDelAll(): Promise<'OK'> {
    await this.userSvc.userUpdateDelAll()
    return 'OK'
  }

  @Get(`/${apiRoute.selfUpdateDel}`)
  async selfCalling(): Promise<'OK'> {
    await this.userSvc.selfUserUpdateDel(1, 3, 3)
    return 'OK'
  }

  @Get(`/${apiRoute.selfReturnMissingAwait}`)
  async selfMissingAwait(): Promise<'OK'> {
    try {
      await this.userSvc.selfMissingAwait(1, 3, 3)
    }
    catch (ex) {
      assert(ex instanceof Error)
      assert(ex.message.includes(Msg.insufficientCallstacks), ex.message)
      const users = await this.userSvc.getUsersNoTrx()
      assert(users.length === 3)
      return 'OK'
    }
    assert(false, 'should not reach here')
  }

  @Get(`/${apiRoute.selfReturnPromise}`)
  async selfReturnPromise(): Promise<'OK'> {
    try {
      await this.userSvc.selfReturnPromise(1, 3, 3)
    }
    catch (ex) {
      assert(ex instanceof Error)
      assert(ex.message.includes(Msg.insufficientCallstacks), ex.message)

      const users = await this.userSvc.getUsersNoTrx()
      assert(users.length === 3)
      return 'OK'
    }
    assert(false, 'should not reach here')
  }

  @Get(`/${apiRoute.throwError}`)
  async throwError(): Promise<'OK'> {
    try {
      await this.userSvc.throwError(1, 3, 3)
    }
    catch (ex) {
      assert(ex instanceof Error)
      assert(ex.message.includes('test error for throwError'))

      const users = await this.userSvc.getUsersNoTrx()
      assert(users.length === 3)

      const [users2, trx2] = await this.userSvc.getUsers()
      assert(users2.length === 3)
      assert(trx2)

      const [users3, trx3] = await this.userSvc.getUsers()
      assert(users3.length === 3)
      assert(trx2 !== trx3)

      return 'OK'
    }

    assert(false, 'should not reach here')
  }

  @Get(`/${apiRoute.returnReject}`)
  async returnReject(): Promise<'OK'> {
    try {
      await this.userSvc.throwError(1, 3, 3)
    }
    catch (ex) {
      assert(ex instanceof Error)
      assert(ex.message.includes('test error for throwError'))
      const users = await this.userSvc.getUsersNoTrx()
      assert(users.length === 3)

      const [users2, trx2] = await this.userSvc.getUsers()
      assert(users2.length === 3)
      assert(trx2)

      const [users3, trx3] = await this.userSvc.getUsers()
      assert(users3.length === 3)
      assert(trx2 !== trx3)

      return 'OK'
    }

    assert(false, 'should not reach here')
  }

}

