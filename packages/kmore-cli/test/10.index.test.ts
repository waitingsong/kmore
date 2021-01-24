import { accessSync } from 'fs'

import { basename, rimraf } from '@waiting/shared-core'
import { tap, finalize, delay } from 'rxjs/operators'

import { runCmd, RunCmdArgs } from '../src/index'

// eslint-disable-next-line import/order
import assert = require('power-assert')


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
          tap(({ dictPath, DictTypePath }) => {
            assert(dictPath && dictPath.includes('test.config.__built-dict.ts'))
            assert(DictTypePath && DictTypePath.includes('.kmore.ts'))
            accessSync(dictPath)
            accessSync(DictTypePath)
            // void rimraf(dictPath)
            // void rimraf(DictTypePath)
          }),
          delay(1000),
          finalize(done),
        )
        .subscribe()

      return
    })

    it('with --basedir .test/ 2', (done) => {
      const args: RunCmdArgs = {
        cmd: 'gen',
        debug: true,
        options: {
          path: './test',
        },
      }

      runCmd(args)
        .pipe(
          tap(({ dictPath, DictTypePath }) => {
            assert(dictPath && dictPath.includes('test.config.__built-dict.ts'))
            assert(DictTypePath && DictTypePath.includes('.kmore.ts'))
            accessSync(dictPath)
            accessSync(DictTypePath)
            void rimraf(dictPath)
            void rimraf(DictTypePath)
          }),
          delay(1000),
          finalize(done),
        )
        .subscribe()

      return
    })
  })

})

