// eslint-disable-next-line import/no-extraneous-dependencies
import { Agent } from 'egg'
import { TTables } from 'kmore'

import kmore from './lib/index'
import { EggKmoreConfig } from './lib/model'


export default (agent: Agent): void => {
  if ((agent.config.kmore as EggKmoreConfig<TTables>).agent) {
    kmore(agent)
  }
}

