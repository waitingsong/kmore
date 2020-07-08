import { basename, pathResolve, normalize } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { genTbListTsFilePath, KmorePropKeys, DbDict } from '../src/index'
import { buildDbDictFile } from '../src/lib/build'
import { initOptions, initBuildSrcOpts } from '../src/lib/config'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should buildDbDictFile() works', () => {
    it('with valid options', async () => {
      const path = './test/test.config.ts'
      const targetPath = await buildDbDictFile(path, initBuildSrcOpts)
      const expectedPath = genTbListTsFilePath(pathResolve(path), initOptions.outputFileNameSuffix)

      assert(
        normalize(targetPath).toLowerCase() === normalize(expectedPath).toLowerCase(),
        `retPath: ${targetPath}, expectedPath: ${expectedPath}`,
      )

      const mods: Record<string, DbDict> = await import(targetPath)
      const keyArr = [
        KmorePropKeys.tables,
        KmorePropKeys.columns,
        KmorePropKeys.aliasColumns,
        KmorePropKeys.scopedColumns,
      ]

      assert(mods && typeof mods === 'object')
      keyArr.forEach((col) => {
        Object.values(mods).forEach((dict: DbDict) => {
          const contains = Object.keys(dict).some(key => key === col)
          assert(col && contains === true, `${col} not existing`)
        })
      })
    })
  })

})

