/* eslint-disable import/no-extraneous-dependencies */
// eslint-disable-next-line node/no-unpublished-import
import { Agent } from 'egg'

import kmore from './lib/index'
import { EggKmoreConfig } from './lib/types'


export default (agent: Agent): void => {
  if ((agent.config.kmore as EggKmoreConfig).agent) {
    kmore(agent)
  }
}

