import { basename, pathResolve, normalize } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { initOptions, initBuildSrcOpts } from '../src/lib/config'
import { buildSrcTablesFile } from '../src/lib/build'
import { genTbListTsFilePath } from '../src/lib/util'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should buildSrcTablesFile() works', () => {
    it('with valid options', async () => {
      const path = './test/test.config.ts'
      const targetPath = await buildSrcTablesFile(path, initBuildSrcOpts)
      const expectedPath = genTbListTsFilePath(pathResolve(path), initOptions.outputFileNameSuffix)

      assert(
        normalize(targetPath).toLowerCase() === normalize(expectedPath).toLowerCase(),
        `retPath: ${targetPath}, expectedPath: ${expectedPath}`,
      )
    })
  })


})
