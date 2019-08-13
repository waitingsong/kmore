import { accessSync } from 'fs'

import { basename, pathResolve, normalize, rimraf } from '@waiting/shared-core'
import * as assert from 'power-assert'
import { of, concat } from 'rxjs'
import { tap, finalize, catchError, defaultIfEmpty, mergeMap } from 'rxjs/operators'

import { buildSource } from '../src/lib/build'
import { globalCallerFuncNameSet } from '../src'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should buildSource() works with opts excludePathKeys', () => {
    it('value string ', (done) => {
      const basePath = './test/config'

      // globalCallerFuncNameSet without genFoo yet
      buildSource({ path: basePath, excludePathKeys: 'config3' })
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

    it('value array', (done) => {
      const basePath = './test/config'

      // globalCallerFuncNameSet without genFoo yet
      buildSource({ path: basePath, excludePathKeys: ['config3.ts', 'config31.ts'] })
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

  describe('Should buildSource() works', () => {

    it('with ./test/config/test.config2.ts', (done) => {
      const basePath = './test/config/test.config2.ts'

      buildSource({ path: basePath })
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

    it('with file ./test/config/test.config3.ts', (done) => {
      const path = './test/config/test.config3.ts'

      buildSource({ path })
        .pipe(
          defaultIfEmpty(''),
          tap((targetPath) => {
            assert(! targetPath, 'Should path value empty but NOT: ' + targetPath)
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

    it('with updated globalCallerFuncNameSet', (done) => {
      const path = './test/config/test.config3.ts'

      // update globalCallerFuncNameSet
      of(path)
        .pipe(
          tap(() => {
            globalCallerFuncNameSet.add('genFoo')
          }),
          mergeMap((src) => {
            return buildSource({ path: src })
          }),
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

      buildSource({ path })
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

      buildSource({ path, outputFileNameSuffix })
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

    it('with ./test/config', (done) => {
      const basePath = './test/config'

      // globalCallerFuncNameSet updated with genFoo
      buildSource({ path: basePath })
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

