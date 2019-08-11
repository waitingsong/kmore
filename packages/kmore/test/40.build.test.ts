import { accessSync } from 'fs'

import { basename, pathResolve, normalize, rimraf } from '@waiting/shared-core'
import * as assert from 'power-assert'
import { of } from 'rxjs'
import { tap, finalize, catchError, defaultIfEmpty } from 'rxjs/operators'

import { initOptions, initBuildSrcOpts } from '../src/lib/config'
import { buildSource } from '../src/lib/build'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should buildSource() works', () => {
    it('with dir ./test', (done) => {
      const baseDir = './test'

      buildSource({
        baseDir,
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

    it('with dir [./test/config]', (done) => {
      const baseDir = ['./test/config']

      buildSource({
        baseDir,
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
        baseDir: path,
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
  })
})
