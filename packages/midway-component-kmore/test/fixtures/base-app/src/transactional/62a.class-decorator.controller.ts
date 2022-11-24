import assert from 'node:assert'

import {
  Config as _Config,
  Controller,
  Get,
  Inject,
} from '@midwayjs/core'
import type { Context } from '@mwcp/share'

import { Transactional } from '~/index'
import { apiPrefix, apiRoute } from '../api-route'
import { UserService } from './61a.method-decorator.service'
import { UserService2 } from './62a.class-decorator.service'


@Controller(apiPrefix.classDecorator)
export class ClassDecoratorController {

  @Inject() readonly ctx: Context
  @Inject() readonly userSvc: UserService2
  @Inject() readonly userSvc0: UserService

  @Transactional()
  @Get(`/${apiRoute.controllerUpdate}`)
  async controllerUpdate(): Promise<'OK'> {
    await this.userSvc.userAllWithUpdate()
    return 'OK'
  }

  @Get(`/${apiRoute.seperateTrx}`)
  async serial(): Promise<'OK'> {
    await this.userSvc.getUsers()
    await this.userSvc.getUsers2()
    return 'OK'
  }

  @Get(`/${apiRoute.sibling}`)
  async sibling(): Promise<'OK'> {
    await this.userSvc.userAll2()
    return 'OK'
  }

  @Get(`/${apiRoute.update}`)
  async update(): Promise<'OK'> {
    await this.userSvc.userAllWithUpdate()
    return 'OK'
  }

  @Get(`/${apiRoute.updateDel}`)
  async updateDel(): Promise<'OK'> {
    await this.userSvc.userUpdateDel(1, 3)
    return 'OK'
  }

  @Get(`/${apiRoute.updateDelOneByOne}`)
  async siblingUpdateDelOneByOne(): Promise<'OK'> {
    await this.userSvc.userUpdateDel(1, 3)
    await this.userSvc.userUpdateDel(2, 2)
    await this.userSvc.userUpdateDel(3, 1)
    return 'OK'
  }

  @Get(`/${apiRoute.controllerUpdateDelOneByOne}`)
  async controllerSiblingUpdateDelOneByOne(): Promise<'OK'> {
    await this.userSvc.userUpdateDel(1, 3)
    await this.userSvc.userUpdateDel(2, 2)
    await this.userSvc.userUpdateDel(3, 1)
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
      console.error('should no error thrown')
      throw ex
    }
    const users = await this.userSvc0.getUsersNoTrx()
    assert(users.length === 3)
    return 'OK'
  }

  @Get(`/${apiRoute.selfReturnPromise}`)
  async selfReturnPromise(): Promise<'OK'> {
    try {
      await this.userSvc.selfReturnPromise(1, 3)
    }
    catch (ex) {
      assert(ex instanceof Error)
      assert(ex.message.includes('Insufficient call stacks'), ex.message)
    }
    const users = await this.userSvc0.getUsersNoTrx()
    assert(users.length === 3)
    return 'OK'
  }

  @Get(`/${apiRoute.throwError}`)
  async throwError(): Promise<'OK'> {
    try {
      await this.userSvc.throwError(1, 3)
    }
    catch (ex) {
      assert(ex instanceof Error)
      assert(ex.message.includes('test error for throwError'))
    }

    const users = await this.userSvc0.getUsersNoTrx()
    assert(users.length === 3)

    const [users2] = await this.userSvc.getUsers()
    assert(users2.length === 3)

    return 'OK'
  }

  @Get(`/${apiRoute.returnReject}`)
  async returnReject(): Promise<'OK'> {
    try {
      await this.userSvc.throwError(1, 3)
    }
    catch (ex) {
      assert(ex instanceof Error)
      assert(ex.message.includes('test error for throwError'))
    }

    const users = await this.userSvc0.getUsersNoTrx()
    assert(users.length === 3)

    const [users2] = await this.userSvc.getUsers()
    assert(users2.length === 3)

    return 'OK'
  }
}

