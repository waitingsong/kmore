/* eslint-disable import/no-extraneous-dependencies */
// eslint-disable-next-line node/no-unpublished-import
import { Application } from 'egg'

import kmore from './lib/index'
import { EggKmoreConfig } from './lib/types'


export default (app: Application): void => {
  if ((app.config.kmore as EggKmoreConfig).app) {
    kmore(app)
  }
}

