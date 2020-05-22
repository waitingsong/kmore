import { basename, pathResolve, normalize } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { buildSrcTablesFile } from '../src/lib/build'
import { initOptions, initBuildSrcOpts, DbPropKeys } from '../src/lib/config'
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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const mods = await import(targetPath)
      const colSuffixArr = [
        DbPropKeys.tables,
        DbPropKeys.columns,
      ]

      assert(mods && typeof mods === 'object')
      colSuffixArr.forEach((col) => {
        const contains = Object.keys(mods).some(key => key.endsWith(col))
        assert(contains === true, `${col} not existing`)
      })
    })
  })


})
