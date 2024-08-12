import type { Attributes } from '@mwcp/otel'
import { genISO8601String } from '@waiting/shared-core'

import type { DbConfig, KmoreAttrNames } from './types.js'


export function genCommonAttr(eventName: string, attrs?: Attributes): Attributes {
  const events: Attributes = {
    event: eventName,
    time: genISO8601String(),
    ...attrs,
  }
  return events
}

export function eventNeedTrace(eventName: KmoreAttrNames, dbConfig: DbConfig): boolean {
  if (! dbConfig.enableTrace) {
    return false
  }

  const { traceEvents } = dbConfig
  if (! traceEvents || traceEvents === 'all') {
    return true
  }
  return traceEvents.has(eventName)
}

