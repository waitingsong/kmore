import assert from 'node:assert/strict'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  fileShortPath,
  genAbsolutePath,
  genCurrentDirname,
} from '@waiting/shared-core'
import {
  createSourceFile,
  transformCallExpressionToLiteralType,
  TransFormOptions,
} from '@waiting/shared-types-dev'
import { run } from 'rxrunscript'

import { expectedDict, expectedDict2 } from '../demo-config.js'


const __dirname = genCurrentDirname(import.meta.url)

describe(fileShortPath(import.meta.url), () => {
  const path1 = join(__dirname, 'demo1.ts')
  const path3 = join(__dirname, 'demo3.ts')
  const tsConfigFilePath = join(__dirname, '../../tsconfig.json')
  const defaultOpts = {
    needle: 'genDbDict',
    leadingString: 'eslint-disable',
    trailingString: 'eslint-enable',
    appendingTypeAssert: true,
  }

  beforeEach(async () => {
    await run(`git restore ${path1} ${path3}`).toPromise()
  })
  after(async () => {
    await run(`git restore ${path1} ${path3}`).toPromise()
  })

  describe('Should transform works', () => {
    it('demo1', async () => {
      const path = path1
      const file = createSourceFile(path, { tsConfigFilePath })
      const opts: TransFormOptions = {
        ...defaultOpts,
        sourceFile: file,
      }

      transformCallExpressionToLiteralType(opts)
      file.saveSync()

      const path2 = genAbsolutePath(path, true)
      const dict = (await import(path2)).dict
      assert.deepStrictEqual(dict, expectedDict)
    })
    it('demo1 result', () => {
      const path = path1
      const file = createSourceFile(path)
      const opts: TransFormOptions = {
        ...defaultOpts,
        sourceFile: file,
      }

      const ret = transformCallExpressionToLiteralType(opts)
      assert(ret.size > 0)
      const arr = ret.fromKey('dict')
      assert(arr.length === 1)
      assert.deepStrictEqual(arr[0], expectedDict)

      let posKey = 'dict:6:14'
      let obj = ret.fromPosKey(posKey)
      assert.deepStrictEqual(obj, expectedDict)

      posKey = 'dict:6:15'
      obj = ret.fromPosKey(posKey)
      assert(! obj)
    })


    it('demo3', async () => {
      const path = path3
      const file = createSourceFile(path)
      const opts: TransFormOptions = {
        ...defaultOpts,
        sourceFile: file,
      }

      transformCallExpressionToLiteralType(opts)
      file.saveSync()

      const { dict1, dict2 } = await import(genAbsolutePath(path, true))
      assert.deepStrictEqual(dict1, expectedDict)
      assert.deepStrictEqual(dict2, expectedDict2)
    })
    it('demo3 result', () => {
      const path = path3
      const file = createSourceFile(path)
      const opts: TransFormOptions = {
        ...defaultOpts,
        sourceFile: file,
      }

      const ret = transformCallExpressionToLiteralType(opts)
      assert(ret.size === 2)

      const arr1 = ret.fromKey('dict1')
      assert(arr1.length === 1)
      const [obj1] = arr1
      assert.deepStrictEqual(obj1, expectedDict)

      const arr2 = ret.fromKey('dict2')
      assert(arr2.length === 1)
      const [obj2] = arr2
      assert.deepStrictEqual(obj2, expectedDict2)

      let posKey = 'dict1:6:14'
      assert.deepStrictEqual(ret.fromPosKey(posKey), expectedDict)
      posKey = 'dict2:7:14'
      assert.deepStrictEqual(ret.fromPosKey(posKey), expectedDict2)
    })
  })

})

