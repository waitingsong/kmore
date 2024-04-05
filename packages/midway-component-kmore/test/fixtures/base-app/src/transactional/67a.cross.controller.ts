import {
  Controller,
  Get,
  Inject,
} from '@midwayjs/core'
import type { Context } from '@mwcp/share'

import { apiPrefix, apiRoute } from '../api-route.js'

import { UserService3 } from './67b.cross.service.js'


@Controller(apiPrefix.crossClassDecorator)
export class CrossClassDecoratorController {

  @Inject() readonly ctx: Context
  @Inject() readonly userSvc3: UserService3


  @Get(`/${apiRoute.get}`)
  async get(): Promise<'OK'> {
    await this.userSvc3.userAll2()
    return 'OK'
  }

  @Get(`/${apiRoute.delete}`)
  async delete(): Promise<'OK'> {
    await this.userSvc3.delete()
    return 'OK'
  }

}

