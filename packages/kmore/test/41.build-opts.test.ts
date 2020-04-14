import { basename, pathResolve, normalize } from '@waiting/shared-core'
import * as assert from 'power-assert'
import { genTbListTsFilePath, DbPropKeys } from 'kmore-types'

import { buildKTablesFile } from '../src/lib/build'
import { initOptions, initBuildSrcOpts } from '../src/lib/config'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should buildKTablesFile() works', () => {
    it('with valid options', async () => {
      const path = './test/test.config.ts'
      const targetPath = await buildKTablesFile(path, initBuildSrcOpts)
      const expectedPath = genTbListTsFilePath(pathResolve(path), initOptions.outputFileNameSuffix)

      assert(
        normalize(targetPath).toLowerCase() === normalize(expectedPath).toLowerCase(),
        `retPath: ${targetPath}, expectedPath: ${expectedPath}`,
      )

      const mods = await import(targetPath)
      const keyArr = [
        DbPropKeys.tables,
        DbPropKeys.columns,
        DbPropKeys.aliasColumns,
        DbPropKeys.scopedColumns,
      ]

      assert(mods && typeof mods === 'object')
      keyArr.forEach((col) => {
        const contains = Object.keys(mods).some(key => key.endsWith(col))
        assert(col && contains === true, `${col} not existing`)
      })
    })
  })


})

