import { accessSync } from 'fs'

import { basename, rimraf } from '@waiting/shared-core'
import * as assert from 'power-assert'
import { of } from 'rxjs'
import { tap, finalize, defaultIfEmpty, mergeMap } from 'rxjs/operators'

import { buildSource } from '../src/lib/build'
import { globalCallerFuncNameSet } from '../src'


const filename = basename(__filename)

describe(filename, () => {

  describe('Should buildSource() works with opts excludePathKeys', () => {
    it('value string ', (done) => {
      const basePath = './test/config'

      globalCallerFuncNameSet.delete('genFoo')

      // globalCallerFuncNameSet without genFoo yet
      buildSource({ path: basePath, excludePathKeys: 'config3' })
        .pipe(
          defaultIfEmpty(''),
          tap((targetPath) => {
            console.log(`target: "${targetPath}"`)
            assert(targetPath && targetPath.length, 'path value invalid.')
            accessSync(targetPath)
          }),
          mergeMap(rimraf),
          finalize(done),
        )
        .subscribe()

      return
    })

    it('value array', (done) => {
      const basePath = './test/config'

      globalCallerFuncNameSet.delete('genFoo')

      // globalCallerFuncNameSet without genFoo yet
      buildSource({ path: basePath, excludePathKeys: ['config3.ts', 'config31.ts'] })
        .pipe(
          defaultIfEmpty(''),
          tap((targetPath) => {
            console.log(`target: "${targetPath}"`)
            assert(targetPath && targetPath.length, 'path value invalid.')
            accessSync(targetPath)
          }),
          mergeMap(rimraf),
          finalize(done),
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
          }),
          mergeMap(rimraf),
          finalize(done),
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
        )
        .subscribe()

      return
    })

    it('with updated globalCallerFuncNameSet', (done) => {
      const path = './test/config/test.config3.ts'

      globalCallerFuncNameSet.add('genFoo')
      // update globalCallerFuncNameSet
      of(path)
        .pipe(
          mergeMap((src) => {
            return buildSource({ path: src })
          }),
          defaultIfEmpty(''),
          tap((targetPath) => {
            console.log(`target: "${targetPath}"`)
            assert(targetPath && targetPath.length, 'path value invalid.')
            accessSync(targetPath)
          }),
          mergeMap(rimraf),
          finalize(done),
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
          }),
          mergeMap(rimraf),
          finalize(done),
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
          }),
          mergeMap(rimraf),
          finalize(done),
        )
        .subscribe()

      return
    })

    it('with ./test/config', (done) => {
      const basePath = './test/config'

      globalCallerFuncNameSet.add('genFoo')
      // globalCallerFuncNameSet updated with genFoo
      buildSource({ path: basePath })
        .pipe(
          defaultIfEmpty(''),
          tap((targetPath) => {
            console.log(`target: "${targetPath}"`)
            assert(targetPath && targetPath.length, 'path value invalid.')
            accessSync(targetPath)
          }),
          mergeMap(rimraf),
          finalize(() => {
            globalCallerFuncNameSet.delete('genFoo')
            done()
          }),
        )
        .subscribe()

      return
    })
  })


  describe('Should buildSource() works with opts maxScanLines', () => {
    it('value zero for ./test/config', (done) => {
      const basePath = './test/config'

      globalCallerFuncNameSet.add('genFoo')
      buildSource({ path: basePath, maxScanLines: 0 })
        .pipe(
          tap((targetPath) => {
            console.log(`target: "${targetPath}"`)
            assert(! targetPath, 'Should path value empty.')
          }),
          finalize(() => {
            globalCallerFuncNameSet.delete('genFoo')
            done()
          }),
        )
        .subscribe()

      return
    })

    it('value 1 for ./test/config/test.config3.ts', (done) => {
      const basePath = './test/config/test.config3.ts'

      globalCallerFuncNameSet.add('genFoo')
      // matched but no output
      buildSource({ path: basePath, maxScanLines: 1 })
        .pipe(
          defaultIfEmpty(''),
          tap((targetPath) => {
            assert(! targetPath, 'Should value empty.')
          }),
          finalize(() => {
            globalCallerFuncNameSet.delete('genFoo')
            done()
          }),
        )
        .subscribe()

      return
    })

    it('value 6 for ./test/config/test.config3.ts', (done) => {
      const basePath = './test/config/test.config3.ts'

      globalCallerFuncNameSet.add('genFoo')
      // matched also output
      buildSource({ path: basePath, maxScanLines: 6 })
        .pipe(
          defaultIfEmpty(''),
          tap((targetPath) => {
            console.log(`target: "${targetPath}"`)
            assert(targetPath && targetPath.length, 'path value invalid.')
            accessSync(targetPath)
          }),
          mergeMap(rimraf),
          finalize(() => {
            globalCallerFuncNameSet.delete('genFoo')
            done()
          }),
        )
        .subscribe()

      return
    })
  })


  describe('Should buildSource() works with empty source file', () => {
    it('emptylines.ts', (done) => {
      const basePath = './test/config/emptylines.ts'

      buildSource({ path: basePath })
        .pipe(
          tap((targetPath) => {
            console.log(`target: "${targetPath}"`)
            assert(! targetPath, 'Should path value empty.')
          }),
          finalize(done),
        )
        .subscribe()

      return
    })
  })

})

