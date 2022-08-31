// config for `npm run cov|ci`
import { MidwayConfig } from '@midwayjs/core'
import { TracerTag } from '@mwcp/jaeger'


type AppConfig = Partial<MidwayConfig>

export const tracerConfig: AppConfig['tracerConfig'] = {
  tracingConfig: {
    sampler: {
      type: 'const',
      param: 1,
    },
    reporter: {
      agentHost: process.env['JAEGER_AGENT_HOST'] ?? '192.168.1.248',
    },
  },
}

export const tracerMiddlewareConfig: AppConfig['tracerMiddlewareConfig'] = {
  ignore: [
    '/favicon.ico',
    '/favicon.png',
    '/ping',
    '/metrics',
    '/untracedPath',
    /\/unitTest[\d.]+/u,
  ],
}

