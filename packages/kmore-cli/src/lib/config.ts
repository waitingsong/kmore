/* eslint-disable id-length */
import { CallerFuncNameSet } from 'kmore-types'

import { CliArgs, Options } from './types'


export const cmdSet = new Set(['gen'])

export const tw1 = '\t'.repeat(1)
export const tw2 = '\t'.repeat(2)
export const tw3 = '\t'.repeat(3)

export const initialCliArgs: CliArgs = {
  cmd: void 0,
  options: {
    project: '',
    path: '',
  },
  needHelp: false,
  debug: false,
}

export const globalCallerFuncNameSet: CallerFuncNameSet = new Set(['genDbDict'])

export const initOptions: Required<Options> = {
  /** tsConfigFilePath */
  project: '',
  callerFuncNames: globalCallerFuncNameSet,
  path: [],
  concurrent: 5,
  excludePathKeys: ['node_modules'],
  maxScanLines: 200,
}

