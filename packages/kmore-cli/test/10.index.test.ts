import assert from 'node:assert/strict'
import { accessSync, copyFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import {
  fileShortPath,
  genCurrentDirname,
  pathResolve,
} from '@waiting/shared-core'
import { firstValueFrom } from 'rxjs'
import { tap, finalize, delay, defaultIfEmpty } from 'rxjs/operators'
import { run } from 'rxrunscript'

import { runCmd, RunCmdArgs } from '../src/index.js'

import { expectedDict1, expectedDict2 } from './demo1.expect.js'


const __dirname = genCurrentDirname(import.meta.url)

describe(fileShortPath(import.meta.url), () => {
  const tsConfigFilePath = join(__dirname, 'demo/tsconfig.json')
  const tsConfigFilePathCjs = join(__dirname, 'demo/tsconfig.cjs.json')
  const tsDemo1 = join(__dirname, 'demo/demo1.ts')
  const jsDemo1 = join(__dirname, 'demo/demo1.js')
  const paths = `"${jsDemo1}"`
  const jsPaths: string[] = []

  beforeEach(async () => {
    await firstValueFrom(run(`git restore ${paths}`))
  })
  after(async () => {
    await firstValueFrom(run(`git restore ${paths}`))
    jsPaths.forEach((path) => {
      void rm(path)
    })
  })

  describe('Should cmd gen work', () => {
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
              copyFileSync(jsDemo1, targetJs)
              accessSync(targetJs)
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
              copyFileSync(jsDemo1, targetJs)
              await assertsDemo1(path, tsDemo1, targetJs)
            },
          }),
          delay(200),
          finalize(done),
        )
        .subscribe()

      return
    })

    it('ESM with --path test/demo --project <tsConfigFilePath>', (done) => {
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
              copyFileSync(jsDemo1, targetJs)
              await assertsDemo1(path, tsDemo1, targetJs)
            },
          }),
          delay(200),
          finalize(done),
        )
        .subscribe()

      return
    })

    it('CJS with --path test/demo --project <tsConfigFilePath>', (done) => {
      const args: RunCmdArgs = {
        cmd: 'gen',
        debug: false,
        options: {
          project: tsConfigFilePathCjs,
          format: 'cjs',
          path: 'test/demo',
        },
      }
      const targetJs = `${jsDemo1}.${Math.random()}.cjs`
      jsPaths.push(targetJs)

      runCmd(args)
        .pipe(
          defaultIfEmpty(''),
          tap({
            async next(path) {
              copyFileSync(jsDemo1, targetJs)
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
              copyFileSync(jsDemo1, targetJs)
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

  console.log({ path, jsPath, tsPath })

  assert(path.includes('test/demo/'))
  assert(path.includes('.ts'))
  assert(! path.includes('d.ts'))
  assert(pathResolve(path) === tsPath)

  accessSync(path)
  accessSync(jsPath)
  accessSync(tsPath)

  let mods = {
    dict1: null,
    dict2: null,
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mods = await import(jsPath)
  }
  catch (ex) {
    assert(false, (ex as Error).message)
    return
  }
  assert(mods)
  assert(mods.dict1)
  assert(mods.dict2)
  const { dict1, dict2 } = mods

  assert.deepStrictEqual(dict1, expectedDict1)
  assert.deepStrictEqual(dict2, expectedDict2)
}

