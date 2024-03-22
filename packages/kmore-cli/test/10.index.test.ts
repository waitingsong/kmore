/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import assert from 'node:assert/strict'
import { stat, cp, rm } from 'node:fs/promises'
import { join } from 'node:path'

import {
  fileShortPath,
  genCurrentDirname,
  pathResolve,
  sleep,
} from '@waiting/shared-core'
import { $ } from 'zx'

import { runCmd, RunCmdArgs } from '../src/index.js'

import { expectedDict1, expectedDict2 } from './demo1.expect.js'


const __dirname = genCurrentDirname(import.meta.url)

describe(fileShortPath(import.meta.url), () => {
  const tsConfigFilePath = join(__dirname, 'demo/tsconfig.json')
  const tsConfigFilePathCjs = join(__dirname, 'demo/tsconfig.cjs.json')
  const demo1Ts = 'demo/demo1.ts'
  const demo1Js = 'demo/demo1.js'
  const tsDemo1 = join(__dirname, demo1Ts)
  const jsDemo1 = join(__dirname, demo1Js)
  const demoPath = `${__dirname}/demo`
  const jsPaths: string[] = ['demo1.d.ts']

  beforeEach(async () => {
    await sleep(100)
    await $`git restore test/demo`
  })
  after(async () => {
    await rm(demoPath, { recursive: true })
    await $`git restore test/demo`
  })

  describe('Should cmd gen work', () => {
    it('with --path test/demo', async () => {
      const args: RunCmdArgs = {
        cmd: 'gen',
        debug: true,
        options: {
          path: 'test/demo',
        },
      }
      const targetJs = `${jsDemo1}.${Math.random()}.js`
      jsPaths.push(targetJs)

      const data = await runCmd(args)
      console.log({ data })
      assert(Array.isArray(data))
      assert(data.length)

      for (const path of data) {
        await cp(jsDemo1, targetJs)
        const fileStat = await stat(targetJs)
        assert(fileStat.isFile(), `fileStat.isFile() ${targetJs}`)
        await assertsDemo1(path, tsDemo1, targetJs)

        await rm(targetJs, { force: true })
      }
    })

    it('with --path absolute test/demo', async () => {
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

      const data = await runCmd(args)
      assert(Array.isArray(data))
      assert(data.length)
      for (const path of data) {
        await cp(jsDemo1, targetJs)
        await assertsDemo1(path, tsDemo1, targetJs)

        await rm(targetJs, { force: true })
      }
    })

    it('ESM with --path test/demo --project <tsConfigFilePath>', async () => {
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

      const data = await runCmd(args)
      assert(Array.isArray(data))
      assert(data.length)
      for (const path of data) {
        await cp(jsDemo1, targetJs)
        await assertsDemo1(path, tsDemo1, targetJs)

        await rm(targetJs, { force: true })
      }
    })

    it('CJS with --path test/demo --project <tsConfigFilePath>', async () => {
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

      const data = await runCmd(args)
      assert(Array.isArray(data))
      assert(data.length)
      for (const path of data) {
        await cp(jsDemo1, targetJs)
        await assertsDemo1(path, tsDemo1, targetJs)

        await rm(targetJs, { force: true })
      }
    })

    it('with --path absolute test/demo --project <tsConfigFilePath>', async () => {
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

      const data = await runCmd(args)
      assert(Array.isArray(data))
      assert(data.length)
      for (const path of data) {
        await cp(jsDemo1, targetJs)
        await assertsDemo1(path, tsDemo1, targetJs)

        await rm(targetJs, { force: true })
      }
    })
  })
})


async function assertsDemo1(
  path: string,
  tsPath: string,
  jsPath: string,
): Promise<void> {

  console.log({ path, jsPath, tsPath })

  const line = path.replace(/\\+/ug, '/')
  assert(line.includes('test/demo/'), `line: ${line}`)
  assert(path.includes('.ts'))
  assert(! path.includes('d.ts'))
  const expectPath = pathResolve(tsPath)
  assert(expectPath === tsPath, `expectPath: ${expectPath}, tsPath: ${tsPath}`)

  try {
    await $`ls -l test/demo`
  }
  catch (ex) {
    console.info({ ex })
  }

  const pathStat = await stat(path)
  assert(pathStat.isFile(), `pathStat.isFile() ${path}`)

  const jsPathStat = await stat(jsPath)
  assert(jsPathStat.isFile(), `jsPathStat.isFile() ${jsPath}`)

  const tsPathStat = await stat(tsPath)
  assert(tsPathStat.isFile(), `tsPathStat.isFile() ${tsPath}`)

  let mods = {
    dict1: null,
    dict2: null,
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const p1 = 'file://' + jsPath.replace(/\\+/ug, '/')
    mods = await import(p1)
  }
  catch (ex) {
    console.error('jsPath:', jsPath)
    assert(false, (ex as Error).message)
  }
  assert(mods)
  assert(mods.dict1)
  assert(mods.dict2)
  const { dict1, dict2 } = mods

  assert.deepStrictEqual(dict1, expectedDict1)
  assert.deepStrictEqual(dict2, expectedDict2)
}

