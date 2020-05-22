// eslint-disable-next-line import/no-extraneous-dependencies
import { Application } from 'egg'
import { TTables } from 'kmore'

import kmore from './lib/index'
import { EggKmoreConfig } from './lib/model'


export default (app: Application): void => {
  if ((app.config.kmore as EggKmoreConfig<TTables>).app) {
    kmore(app)
  }
}

