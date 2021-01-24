/* eslint-disable import/first */
import {
  basename,
  pathResolve,
  normalize,
  unlinkAsync,
  isFileExists,
  readFileAsync,
} from '@waiting/shared-core'
import rewire = require('rewire')

import { BuildSrcOpts, genDbDictTypeTsFilePath, DbModel, CallerDbMap, BuildSrcRet } from '../../src/index'
import { initBuildSrcOpts } from '../../src/lib/config'

// eslint-disable-next-line import/order
import assert = require('power-assert')


const filename = basename(__filename)
const mods = rewire('../../src/lib/build')

describe(filename, () => {

  describe('Should buildDbDictTypeFile() works', () => {
    const fnName = 'buildDbDictTypeFile'
    const fn = mods.__get__(fnName) as <D extends DbModel>(
      srcFile: string,
      options: BuildSrcOpts,
      callerDbMap?: CallerDbMap<D>,
    ) => Promise<BuildSrcRet['DictTypePath']>

    it('normal', async () => {
      const path = './test/test.config.ts'
      const opts: Required<BuildSrcOpts> = {
        ...initBuildSrcOpts,
        DictTypeFolder: false, // under the dir of the ${path} if false
        DictTypeFileName: `.temp.${filename}.ts`,
      }
      const ret = await fn(path, opts)
      assert(ret)
      const targetPath = pathResolve(ret)

      const expectedPath = await genDbDictTypeTsFilePath(
        pathResolve(path),
        opts.DictTypeFolder,
        opts.DictTypeFileName,
      )
      assert(
        normalize(targetPath).toLowerCase() === normalize(expectedPath).toLowerCase(),
        `retPath: ${targetPath}, expectedPath: ${expectedPath}`,
      )

      const exists = await isFileExists(targetPath)
      assert(exists === true)

      const buf = await readFileAsync(targetPath)
      const code = buf.toString()
      assert(code.length && /export interface/.test(code))

      await unlinkAsync(targetPath)
    })

    it('duplicate type name check with alias', async () => {
      const path = './test/buildSource/config.ts'
      const path2 = './test/buildSource/config3.ts'
      const opts: Required<BuildSrcOpts> = {
        ...initBuildSrcOpts,
        DictTypeFolder: false, // under the dir of the ${path} if false
        DictTypeFileName: 'temp.dict-type-test-alias-type.ts',
      }
      const ret = await fn(path, opts)
      const targetPath = pathResolve(ret)

      // duplicate type name but pass alias 'DbAlias'
      await fn(path2, opts)

      await unlinkAsync(targetPath)
    })

    it('duplicate type name check', async () => {
      const path = './test/buildSource/config.ts'
      const path2 = './test/buildSource/config2.ts'
      const opts: Required<BuildSrcOpts> = {
        ...initBuildSrcOpts,
        DictTypeFolder: false, // under the dir of the ${path} if false
        DictTypeFileName: 'temp.dict-type-test-dup-type.ts',
      }
      const ret = await fn(path, opts)
      const targetPath = pathResolve(ret)

      try {
        // duplicate type name 'Db'
        await fn(path2, opts)
      }
      catch (ex) {
        // console.info(ex.message)
        await unlinkAsync(targetPath)
        return
      }
      assert(false, 'Should throw error with dup type name, but not.')
    })
    it('create type alias instead of dup type content with different type name', async () => {
      const path = './test/buildSource/config.ts'
      const path2 = './test/buildSource/config4.ts'
      const opts: Required<BuildSrcOpts> = {
        ...initBuildSrcOpts,
        DictTypeFolder: false, // under the dir of the ${path} if false
        DictTypeFileName: 'temp.dict-type-test-dup-type-ref.ts',
      }
      const ret = await fn(path, opts)
      const targetPath = pathResolve(ret)

      // will create type Db2Dict ref to the equal type declartion to the Db
      await fn(path2, opts)
      const code = (await readFileAsync(targetPath)).toString()
      assert(code)
      assert(code.includes('export type Db2Dict = DbDict'))

      await unlinkAsync(targetPath)
    })

    it('duplicate dict detect', async () => {
      const path = './test/test.config.ts'
      const opts: Required<BuildSrcOpts> = {
        ...initBuildSrcOpts,
        DictTypeFolder: false, // under the dir of the ${path} if false
        DictTypeFileName: 'temp.dict-type-test-dup-var.ts',
      }
      const ret = await fn(path, opts)
      const targetPath = pathResolve(ret)

      // skip with same dict
      await fn(path, opts)

      await unlinkAsync(targetPath)
    })
  })

})

