import { accessSync } from 'fs'

import { basename, pathResolve, normalize, rimraf } from '@waiting/shared-core'
import * as assert from 'power-assert'
import { of } from 'rxjs'
import { tap, finalize, catchError, defaultIfEmpty } from 'rxjs/operators'

import { buildSource } from '../src/lib/build'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should buildSource() works', () => {
    it('with dir [./test/config]', (done) => {
      const baseDir = ['./test/config']

      buildSource({
        path: baseDir,
      })
        .pipe(
          defaultIfEmpty(''),
          tap((targetPath) => {
            console.log(`target: "${targetPath}"`)
            assert(targetPath && targetPath.length, 'path value invalid.')
            accessSync(targetPath)
            rimraf(targetPath)
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

    it('with file ./test/config/test.config2.ts', (done) => {
      const path = './test/config/test.config2.ts'

      buildSource({
        path,
      })
        .pipe(
          defaultIfEmpty(''),
          tap((targetPath) => {
            console.log(`target: "${targetPath}"`)
            assert(targetPath && targetPath.length, 'path value invalid.')
            accessSync(targetPath)
            rimraf(targetPath)
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

    it('with file [./test/config/test.config2.ts]', (done) => {
      const path = ['./test/config/test.config2.ts']

      buildSource({
        path,
      })
        .pipe(
          defaultIfEmpty(''),
          tap((targetPath) => {
            console.log(`target: "${targetPath}"`)
            assert(targetPath && targetPath.length, 'path value invalid.')
            accessSync(targetPath)
            rimraf(targetPath)
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

    it('with opts outputFileNameSuffix', (done) => {
      const path = './test/config/test.config2.ts'
      const outputFileNameSuffix = 'foo' + Math.random().toString()

      buildSource({
        path,
        outputFileNameSuffix,
      })
        .pipe(
          defaultIfEmpty(''),
          tap((targetPath) => {
            console.log(`target: "${targetPath}"`)
            assert(targetPath && targetPath.length, 'target path value invalid.')
            assert(targetPath.includes(outputFileNameSuffix))
            accessSync(targetPath)
            rimraf(targetPath)
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

