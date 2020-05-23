import { accessSync } from 'fs'

import { basename, rimraf } from '@waiting/shared-core'
import * as assert from 'power-assert'
import { tap, finalize, delay } from 'rxjs/operators'

import { runCmd, RunCmdArgs } from '../src/index'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should cmd gen works', () => {
    it('with --basedir .test/', (done) => {
      const args: RunCmdArgs = {
        cmd: 'gen',
        debug: true,
        options: {
          path: './test',
        },
      }

      runCmd(args)
        .pipe(
          tap((targetPath) => {
            assert(targetPath && targetPath.includes('test.config.__built-tables.ts'))
            accessSync(targetPath)
            void rimraf(targetPath)
          }),
          delay(1000),
          finalize(done),
        )
        .subscribe()

      return
    })

    it(' with --basedir .test/', (done) => {
      const args: RunCmdArgs = {
        cmd: 'gen',
        debug: true,
        options: {
          path: './test',
        },
      }

      runCmd(args)
        .pipe(
          tap((targetPath) => {
            assert(targetPath && targetPath.includes('test.config.__built-tables.ts'))
            accessSync(targetPath)
            void rimraf(targetPath)
          }),
          delay(1000),
          finalize(done),
        )
        .subscribe()

      return
    })
  })

})

