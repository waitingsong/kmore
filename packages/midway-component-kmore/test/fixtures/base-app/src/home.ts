import {
  Controller,
  Get,
} from '@midwayjs/decorator'

import { TestRespBody } from '@/root.config'
import { Context } from '~/interface'
import {
  getConfigFromApp,
} from '~/index'


@Controller('/')
export class HomeController {

  @Get('/')
  async home(ctx: Context): Promise<TestRespBody> {
    const { app, cookies, header, url } = ctx
    const config = getConfigFromApp(app)
    const res = {
      config,
      cookies,
      header,
      url,
    }
    return res
  }

}

