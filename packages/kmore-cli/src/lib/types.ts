import { CallerFuncNameSet } from 'kmore-types'


export type CmdType = 'gen'

export interface InputOptions {
  [prop: string]: string | number
}

export interface RunCmdArgs {
  cmd: CmdType | undefined
  options: Options
  debug: boolean
}

export interface CliArgs extends RunCmdArgs {
  needHelp: boolean
}


export interface Options {
  /** Base dir or file in both relative and absolute style to scan */
  path: FilePath | FilePath[]
  /**
   * Path of tsconfig.json,
   * find under Options['path'] or parents dir, if empty
   */
  project?: FilePath
  /** Default: 5 */
  concurrent?: number
  /** String key to skip build under path. Default: node_modules */
  excludePathKeys?: string | string[]
  /** Maxium file lines to match CallerFuncName (import), Default: 128 */
  maxScanLines?: number
  callerFuncNames?: CallerFuncNameSet
}

export type FilePath = string
