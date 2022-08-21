import { initialConfig } from '../lib/config'
import { Config, ConfigKey } from '../lib/types'

import { Application } from '~/interface'


export function getConfigFromApp(
  app: Application,
  key: ConfigKey = ConfigKey.config,
): Config {

  const pConfig = getConfig<Partial<Config>>(app, key)
  const config = mergeConfig(pConfig)
  return config
}

export function getConfig<T>(app: Application, key: ConfigKey): T {
  const config = app.getConfig(key) as T
  return config
}


export function mergeConfig(input?: Partial<Config>): Config {
  const ret: Config = {
    ...initialConfig,
    ...input,
  }
  return ret
}


