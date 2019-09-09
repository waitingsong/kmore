import { CliArgs } from './model'


export const cmdSet = new Set(['gen'])

export const tw1 = '\t'.repeat(1)
export const tw2 = '\t'.repeat(2)
export const tw3 = '\t'.repeat(3)

export const initialCliArgs: CliArgs = {
  cmd: void 0,
  options: {
    path: '',
  },
  needHelp: false,
  debug: false,
}
