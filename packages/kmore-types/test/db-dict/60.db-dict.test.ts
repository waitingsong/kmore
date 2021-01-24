import { basename, join, writeFileAsync, unlinkAsync, readFileAsync } from '@waiting/shared-core'
import { run } from 'rxrunscript'


import { genDbDictTypeDeclaration, updateDbDictFile } from '../../src/lib/db-dict'

import { kddConst } from './data'

// eslint-disable-next-line import/order
import assert = require('power-assert')


const filename = basename(__filename)

describe(filename, () => {

  describe('Should genDbDictTypeDeclaration() works', () => {
    const typeCode = genDbDictTypeDeclaration(kddConst)
    const random = Math.random().toString()
    const tmpFile = join(__dirname, `temp.genDbDictTypeDeclaration.${random}.ts`)
    const cwd = join(__dirname, '../../') // package dir

    it('noraml', () => {
      assert(typeCode.length, 'Should contains codes')
    })
    it('write result to temp file', async () => {
      const code = `const dbDict: DbDict = ${JSON.stringify(kddConst)}\n${typeCode}`
      // console.log(code)
      await writeFileAsync(tmpFile, code)
    })
    it('eslint check', async () => {
      const eslintConfig = join(cwd, 'test/.eslintrc.yml')
      const eslint = `eslint --fix "${tmpFile}" --config="${eslintConfig}"`
      const ret = await run(eslint, null, { cwd }).toPromise()
      const buf = ret.slice(0, 1)
      assert(buf.byteLength === 0, ret.toString())
    })
    it('tsc check', async () => {
      const tsc = `tsc --noEmit "${tmpFile}"`
      const ret = await run(tsc, null, { cwd }).toPromise()
      const buf2 = ret.slice(0, 1)
      assert(buf2.byteLength === 0, ret.toString())

      // post clean if success
      await unlinkAsync(tmpFile)
    })
  })

  describe('Should updateDbDictFile() works', () => {
    const dbDictTypeName = 'DbDict'
    const typeCode = genDbDictTypeDeclaration(kddConst, dbDictTypeName)
    const random = Math.random().toString()
    const tmpFile = join(__dirname, `temp.updateDbDictFile.${random}.ts`)

    it('noraml', async () => {
      assert(typeCode.length, 'Should contains codes')
      const filePath = await updateDbDictFile(tmpFile, typeCode, dbDictTypeName)
      assert(filePath === tmpFile)
    })
    it('duplicate type name', async () => {
      try {
        await updateDbDictFile(tmpFile, typeCode, dbDictTypeName)
      }
      catch (ex) {
        return
      }
      assert(false, 'Should throw error with dup type Name, but not.')
    })
    it('with fake type name', async () => {
      const dbDictTypeNameFake = 'DbDict' + Math.random().toString()
      const filePath = await updateDbDictFile(tmpFile, typeCode, dbDictTypeNameFake)
      assert(filePath === tmpFile)

      const code = (await readFileAsync(filePath)).toString()
      assert(code.length)

      const needle = `interface ${dbDictTypeNameFake}`
      assert(
        ! code.includes(needle),
        `File should contains two export type name "${dbDictTypeName}", but not contains fake name "${dbDictTypeNameFake}",
code: ${code}
        `,
      )

      const regex = new RegExp(`interface ${dbDictTypeName}`, 'ug')
      // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
      const arr = code.match(regex)
      assert(
        arr && arr.length === 2,
        `File should contains two export type name "${dbDictTypeName}" for test, code\n: ${code}`,
      )

      // post clean if success
      await unlinkAsync(tmpFile)
    })
  })

})

