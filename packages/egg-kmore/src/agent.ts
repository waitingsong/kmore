// eslint-disable-next-line import/no-extraneous-dependencies
import { Agent } from 'egg'

import kmore from './lib/index'


export default (agent: Agent) => {
  agent.config.kmore.agent && kmore(agent)
}

