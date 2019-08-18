// eslint-disable-next-line import/no-extraneous-dependencies
import { Application } from 'egg'

import kmore from './lib/index'


export default (app: Application) => {
  app.config.kmore.app && kmore(app)
}

