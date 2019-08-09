import { basename, pathResolve, normalize, rimraf } from '@waiting/shared-core'
import * as assert from 'power-assert'
import { of, defer, from as ofrom } from 'rxjs'
import {
  tap, finalize, catchError, defaultIfEmpty, mergeMap, mapTo,
} from 'rxjs/operators'

import { initOptions } from '../src/lib/config'
import { buildSrcTablesFile, buildSource } from '../src/lib/build'
import { genTbListTsFilePath, walkDirForCallerFuncTsFiles } from '../src/lib/util'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should buildTablesFile() works', () => {
    it('with valid options', async () => {
      const path = './test/test.config.ts'
      const targetPath = await buildSrcTablesFile(path, initOptions)
      const expectedPath = genTbListTsFilePath(pathResolve(path), initOptions.outputFileNameSuffix)

      assert(
        normalize(targetPath).toLowerCase() === normalize(expectedPath).toLowerCase(),
        `retPath: ${targetPath}, expectedPath: ${expectedPath}`,
      )
    })
  })


  describe('Should walkDirForTsFiles() works', () => {
    const targetPathArr: string[] = []

    it('with ./test', (done) => {
      const baseDir = ['./test']

      walkDirForCallerFuncTsFiles({
        baseDir,
      })
        .pipe(
          defaultIfEmpty(''),
          tap((path) => {
            console.log(`src: "${path}"`)
            assert(path && path.length, 'path value invalid.')
          }),
          mergeMap((path) => {
            return defer(() => buildSrcTablesFile(path, initOptions))
          }, 2),
          tap((targetPath) => {
            console.log(`target: "${targetPath}"`)
            assert(targetPath && targetPath.length, 'path value invalid.')
            targetPathArr.push(targetPath)
          }),
          finalize(done),
          catchError((err: Error) => {
            assert(false, err.message)
            return of('')
          }),
        )
        .subscribe()

      return
    })

    it.skip('with ./src/lib', (done) => {
      const baseDir = ['./src/lib']

      walkDirForCallerFuncTsFiles({
        baseDir,
      })
        .pipe(
          defaultIfEmpty(''),
          tap((path) => {
            console.log(`src: "${path}"`)
            assert(path && path.length, 'path value invalid.')
          }),
          mergeMap((path) => {
            return buildSrcTablesFile(path, initOptions)
          }),
          tap((targetPath) => {
            console.log(`target: "${targetPath}"`)
            // assert(targetPath && targetPath.length, 'path value invalid.')
            targetPath && targetPathArr.push(targetPath)
          }),
          finalize(done),
          catchError((err: Error) => {
            assert(false, err.message)
            return of('')
          }),
        )
        .subscribe()

      return
    })

    it('clean', (done) => {
      ofrom(targetPathArr)
        .pipe(
          mergeMap((path) => {
            assert(path && path.length, 'File path empty')
            const rm$ = defer(() => rimraf(path)).pipe(
              mapTo(path),
            )
            return path ? rm$ : of('')
          }),
          tap((path) => {
            path && console.log(`clean: "${path}"`)
          }),
          finalize(done),
          catchError((err: Error) => {
            assert(false, err.message)
            return of('')
          }),
        )
        .subscribe()

      return
    })
  })


  describe('Should buildSource() works', () => {
    const targetPathArr: string[] = []

    it('with ./test', (done) => {
      const baseDir = ['./test']

      buildSource({
        baseDir,
      })
        .pipe(
          defaultIfEmpty(''),
          tap((targetPath) => {
            console.log(`target: "${targetPath}"`)
            assert(targetPath && targetPath.length, 'path value invalid.')
            targetPathArr.push(targetPath)
          }),
          finalize(done),
          catchError((err: Error) => {
            assert(false, err.message)
            return of('')
          }),
        )
        .subscribe()

      return
    })

    it('clean', (done) => {
      ofrom(targetPathArr)
        .pipe(
          mergeMap((path) => {
            assert(path && path.length, 'File path empty')
            const rm$ = defer(() => rimraf(path)).pipe(
              mapTo(path),
            )
            return path ? rm$ : of('')
          }),
          tap((path) => {
            path && console.log(`clean: "${path}"`)
          }),
          finalize(done),
          catchError((err: Error) => {
            assert(false, err.message)
            return of('')
          }),
        )
        .subscribe()

      return
    })
  })
})
