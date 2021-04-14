import { access, copyFile, rm } from 'fs/promises'

import { basename, join, pathResolve } from '@waiting/shared-core'
import { tap, finalize, delay, defaultIfEmpty } from 'rxjs/operators'
import { run } from 'rxrunscript'

import { runCmd, RunCmdArgs } from '../src/index'

import { expectedDict1, expectedDict2 } from './demo1.expect'

// eslint-disable-next-line import/order
import assert = require('power-assert')


const filename = basename(__filename)

describe(filename, () => {
  const tsConfigFilePath = join(__dirname, 'demo/tsconfig.json')
  const tsDemo1 = join(__dirname, 'demo/demo1.ts')
  const jsDemo1 = join(__dirname, 'demo/demo1.js')
  const paths = `"${jsDemo1}"`
  const jsPaths: string[] = []

  beforeEach(async () => {
    await run(`git restore ${paths}`).toPromise()
  })
  after(async () => {
    await run(`git restore ${paths}`).toPromise()
    jsPaths.forEach((path) => {
      void rm(path)
    })
  })

  describe('Should cmd gen works', () => {
    it('with --path test/demo', (done) => {
      const args: RunCmdArgs = {
        cmd: 'gen',
        debug: true,
        options: {
          path: 'test/demo',
        },
      }
      const targetJs = `${jsDemo1}.${Math.random()}.js`
      jsPaths.push(targetJs)

      runCmd(args)
        .pipe(
          defaultIfEmpty(''),
          tap({
            async next(path) {
              await copyFile(jsDemo1, targetJs)
              await access(targetJs)
              await assertsDemo1(path, tsDemo1, targetJs)
            },
          }),
          delay(200),
          finalize(done),
        )
        .subscribe()

      return
    })

    it('with --path absolute test/demo', (done) => {
      const dir = join(__dirname, 'demo')
      const args: RunCmdArgs = {
        cmd: 'gen',
        debug: true,
        options: {
          path: dir,
        },
      }
      const targetJs = `${jsDemo1}.${Math.random()}.js`
      jsPaths.push(targetJs)

      runCmd(args)
        .pipe(
          defaultIfEmpty(''),
          tap({
            async next(path) {
              await copyFile(jsDemo1, targetJs)
              await assertsDemo1(path, tsDemo1, targetJs)
            },
          }),
          delay(200),
          finalize(done),
        )
        .subscribe()

      return
    })

    it('with --path test/demo --project <tsConfigFilePath>', (done) => {
      const args: RunCmdArgs = {
        cmd: 'gen',
        debug: false,
        options: {
          project: tsConfigFilePath,
          path: 'test/demo',
        },
      }
      const targetJs = `${jsDemo1}.${Math.random()}.js`
      jsPaths.push(targetJs)

      runCmd(args)
        .pipe(
          defaultIfEmpty(''),
          tap({
            async next(path) {
              await copyFile(jsDemo1, targetJs)
              await assertsDemo1(path, tsDemo1, targetJs)
            },
          }),
          delay(200),
          finalize(done),
        )
        .subscribe()

      return
    })

    it('with --path absolute test/demo --project <tsConfigFilePath>', (done) => {
      const dir = join(__dirname, 'demo')
      const args: RunCmdArgs = {
        cmd: 'gen',
        debug: false,
        options: {
          project: tsConfigFilePath,
          path: dir,
        },
      }
      const targetJs = `${jsDemo1}.${Math.random()}.js`
      jsPaths.push(targetJs)

      runCmd(args)
        .pipe(
          defaultIfEmpty(''),
          tap({
            async next(path) {
              await copyFile(jsDemo1, targetJs)
              await assertsDemo1(path, tsDemo1, targetJs)
            },
          }),
          delay(200),
          finalize(done),
        )
        .subscribe()

      return
    })
  })
})


async function assertsDemo1(
  path: string,
  tsPath: string,
  jsPath: string,
): Promise<void> {

  assert(path.includes('test/demo/'))
  assert(path.includes('.ts'))
  assert(! path.includes('d.ts'))
  assert(pathResolve(path) === tsPath)
  await access(path)
  await access(jsPath)
  await access(tsPath)

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { dict1, dict2 } = require(jsPath)
  assert.deepStrictEqual(dict1, expectedDict1)
  assert.deepStrictEqual(dict2, expectedDict2)
}

