import { BuildSrcOpts } from 'kmore-types'


export type CmdType = 'gen'

export type Options = BuildSrcOpts

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
