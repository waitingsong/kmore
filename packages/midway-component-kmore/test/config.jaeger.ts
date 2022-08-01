// config for `npm run cov|ci`
import { MidwayConfig } from '@midwayjs/core'
import { initialConfig as initTracerConfig, TracerTag } from '@mw-components/jaeger'


type AppConfig = Partial<MidwayConfig>

export const tracerConfig: AppConfig['tracerConfig'] = {
  ...initTracerConfig,
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
tracerConfig.loggingReqHeaders?.push(TracerTag.svcName)
tracerConfig.loggingReqHeaders?.push(TracerTag.svcVer)

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

