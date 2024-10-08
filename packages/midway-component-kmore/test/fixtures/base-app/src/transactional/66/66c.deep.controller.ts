import {
  Controller,
  Get,
  Inject,
} from '@midwayjs/core'
import type { Context } from '@mwcp/share'

import { apiBase as apiPrefix, apiMethod as apiRoute } from '../../types/api-test.js'
import { Transactional } from '../../types/index.js'

import { UserService2 } from './163s.class-decorator.service.js'
import { UserService3 } from './65s.deep.service.js'


@Controller(apiPrefix.classDecoratorDeep2)
export class ClassDecoratorDeep2Controller {

  @Inject() readonly ctx: Context
  @Inject() readonly userSvc2: UserService2
  @Inject() readonly userSvc3: UserService3

  @Transactional()
  @Get(`/${apiRoute.controllerUpdate}`)
  async controllerUpdate(): Promise<'OK'> {
    await this.userSvc3.userAllWithUpdate()
    return 'OK'
  }

  @Get(`/${apiRoute.separateTrx}`)
  async serial(): Promise<'OK'> {
    await this.userSvc2.getUsers()
    await this.userSvc3.getUsers2()
    return 'OK'
  }

  @Get(`/${apiRoute.sibling}`)
  async sibling(): Promise<'OK'> {
    await this.userSvc3.userAll2()
    return 'OK'
  }

  @Get(`/${apiRoute.update}`)
  async update(): Promise<'OK'> {
    await this.userSvc3.userAllWithUpdate()
    return 'OK'
  }

  @Get(`/${apiRoute.updateDel}`)
  async updateDel(): Promise<'OK'> {
    await this.userSvc3.userUpdateDel(1, 3)
    return 'OK'
  }

  @Get(`/${apiRoute.updateDelOneByOne}`)
  async siblingUpdateDelOneByOne(): Promise<'OK'> {
    await this.userSvc3.userUpdateDel(1, 3)
    await this.userSvc2.userUpdateDel(2, 2)
    await this.userSvc3.userUpdateDel(3, 1)
    return 'OK'
  }

  @Get(`/${apiRoute.controllerUpdateDelOneByOne}`)
  async controllerSiblingUpdateDelOneByOne(): Promise<'OK'> {
    await this.userSvc2.userUpdateDel(1, 3)
    await this.userSvc3.userUpdateDel(2, 2)
    await this.userSvc2.userUpdateDel(3, 1)
    return 'OK'
  }

  @Get(`/${apiRoute.updateDelAll}`)
  async updateDelAll(): Promise<'OK'> {
    await this.userSvc3.userUpdateDelAll()
    return 'OK'
  }

  @Get(`/${apiRoute.selfUpdateDel}`)
  async selfCalling(): Promise<'OK'> {
    await this.userSvc3.selfUserUpdateDel(1, 3, 3)
    return 'OK'
  }

}

