import {
  basename,
  pathResolve,
  normalize,
  unlinkAsync,
  isFileExists,
  readFileAsync,
} from '@waiting/shared-core'
import * as assert from 'power-assert'

import { BuildSrcOpts, buildSource } from '../../src/index'
import { initOptions, initBuildSrcOpts } from '../../src/lib/config'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should buildSource() works', () => {
    it('normal', async () => {
      const path = './test/buildSource/config.ts'
      const opts: Required<BuildSrcOpts> = {
        ...initBuildSrcOpts,
        path,
        DictTypeFolder: false, // under the dir of the ${path} if false
        DictTypeFileName: `.temp.${filename}.ts`,
      }
      const paths = await buildSource(opts).toPromise()
      console.info(paths)
      assert(paths)
      assert(paths.dictPath)
      assert(paths.DictTypePath)

      assert(await isFileExists(paths.dictPath))
      assert(await isFileExists(paths.DictTypePath))

      await unlinkAsync(paths.dictPath)
      await unlinkAsync(paths.DictTypePath)
    })

  })

})

