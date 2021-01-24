/* eslint-disable import/first */
import { basename, pathResolve, normalize } from '@waiting/shared-core'
import rewire = require('rewire')

import {
  genDbDictTsFilePath,
  KmorePropKeys,
  DbDict,
  DbModel,
  BuildSrcOpts,
  CallerDbMap,
  BuildSrcRet,
} from '../../src/index'
import { initOptions, initBuildSrcOpts } from '../../src/lib/config'

// eslint-disable-next-line import/order
import assert = require('power-assert')


const filename = basename(__filename)
const mods = rewire('../../src/lib/build')

describe(filename, () => {

  describe('Should buildDbDictFile() works', () => {
    const fnName = 'buildDbDictFile'
    const fn = mods.__get__(fnName) as <D extends DbModel>(
      file: string,
      options: BuildSrcOpts,
      callerDbMap?: CallerDbMap<D>,
    ) => Promise<BuildSrcRet['dictPath']>

    it('with valid options', async () => {
      const path = './test/test.config.ts'
      const targetPath = await fn(path, initBuildSrcOpts)
      const expectedPath = genDbDictTsFilePath(pathResolve(path), initOptions.outputFileNameSuffix)

      assert(
        normalize(targetPath).toLowerCase() === normalize(expectedPath).toLowerCase(),
        `retPath: ${targetPath}, expectedPath: ${expectedPath}`,
      )

      const imps: Record<string, DbDict> = await import(targetPath)
      const keyArr = [
        KmorePropKeys.tables,
        KmorePropKeys.columns,
        KmorePropKeys.aliasColumns,
        KmorePropKeys.scopedColumns,
      ]

      assert(imps && typeof imps === 'object')
      keyArr.forEach((col) => {
        Object.values(imps).forEach((dict: DbDict) => {
          const contains = Object.keys(dict).some(key => key === col)
          assert(col && contains === true, `${col} not existing`)
        })
      })
    })
  })

})

