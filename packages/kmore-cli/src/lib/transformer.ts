import assert from 'node:assert'

import {
  pathResolve,
  readFileLineRx,
} from '@waiting/shared-core'
import {
  TransFormOptions,
  createSourceFile,
  transformCallExpressionToLiteralType,
} from '@waiting/shared-types-dev'
import { CallerFuncNameSet } from 'kmore-types'
import { from as ofrom, of, Observable, iif, defer } from 'rxjs'
import { map, mergeMap, filter, reduce, take, catchError, defaultIfEmpty } from 'rxjs/operators'
import { walk, EntryType } from 'rxwalker'
// eslint-disable-next-line import/named
import { CacheStrategy, TsConfigResolverOptions, tsconfigResolver } from 'tsconfig-resolver'

import { globalCallerFuncNameSet, initOptions } from './config.js'
import { FilePath, Options } from './types.js'


/**
 * Generate dbDict .ts files, for CLI
 * include extra scopedColumns, aliasColumns,
 * for testing.
 * no path value emitted if no file generated.
 */
export function buildSource(options: Options): Observable<FilePath> {
  const opts: Required<Options> = {
    ...initOptions,
    ...options,
  }

  const tsConfig$ = defer(async () => {
    if (typeof opts.path === 'string') {
      opts.path = opts.path.replace(/\\/ug, '/')
    }
    else if (Array.isArray(opts.path)) {
      opts.path = opts.path.map(str => str.replace(/\\/ug, '/'))
    }

    if (opts.project) {
      const project = opts.project.replace(/\\/ug, '/')
      if (project.startsWith('.') || ! project.includes('/')) {
        opts.project = `${process.cwd()}/${project}`
      }
    }
    else {
      const tsopts: TsConfigResolverOptions = {
        cache: CacheStrategy.Directory,
      }
      if (typeof opts.path === 'string' && opts.path) {
        tsopts.cwd = pathResolve(opts.path)
      }
      const tt = await tsconfigResolver(tsopts)
      if (! tt.path) {
        throw new Error('Parameter options.p (path of tsconfig.json) is empty and none tsconfig.json found')
      }
      opts.project = tt.path.replace(/\\/ug, '/')
      // console.log('used tsConfigFilePath', opts.project)
    }
    return opts
  })
  // const walk$ = walkDir(opts)
  const walk$ = tsConfig$.pipe(
    mergeMap(walkDir),
  )
  const build$ = walk$.pipe(
    mergeMap(path => buildFile(
      path,
      opts.project,
      options.format,
      opts.callerFuncNames,
    ), opts.concurrent),
    // defaultIfEmpty(''),
  )

  return build$
}

/**
 * Scan and output files which are .ts type and containing keywords of Options['callerFuncNames']
 */
export function walkDir(options: Options): Observable<FilePath> {
  const opts: Required<Options> = {
    ...initOptions,
    ...options,
  }
  const {
    path: basePath,
    concurrent,
    excludePathKeys,
    maxScanLines,
  } = opts
  const maxDepth = 99
  const matchFuncNameSet = globalCallerFuncNameSet

  const dir$: Observable<string> = iif(
    () => {
      if (typeof basePath === 'string') {
        return true
      }
      else if (Array.isArray(basePath)) {
        return false
      }
      else {
        throw new TypeError('Value of baseDir invalid, should be String or Array.')
      }
    },
    of(basePath as string),
    ofrom(basePath as string[]),
  )

  const path$ = dir$.pipe(
    mergeMap(path => walk(path, { maxDepth }), concurrent),
    filter((ev) => {
      const { path } = ev
      return path ? ! ifPathContainsKey(path, excludePathKeys) : false
    }),
    filter(
      ev => ev.type === EntryType.file && ev.path.endsWith('.ts') && ! ev.path.endsWith('.d.ts'),
    ),
    map(ev => ev.path),
    mergeMap((path) => {
      const flag$ = ifFileContentContainsCallerFuncNames(matchFuncNameSet, maxScanLines, path)
      return flag$.pipe(
        map((contains) => {
          return contains ? path : ''
        }),
      )
    }, concurrent),
    filter(path => path.length > 0),
  )

  const ret$ = path$.pipe(
    reduce((acc: string[], val: string) => {
      const path = pathResolve(val)
      if (! acc.includes(path)) {
        acc.push(path)
      }
      return acc
    }, []),
    mergeMap(paths => ofrom(paths)),
  )

  return ret$
}


/**
 * Build dbDict const and type code
 */
export async function buildFile(
  path: string,
  tsConfigFilePath: string,
  format: Options['format'],
  callerFuncNames: NonNullable<Options['callerFuncNames']>,
): Promise<FilePath> {

  assert(path, 'path is required')
  assert(tsConfigFilePath, 'tsConfigFilePath is required')
  assert(callerFuncNames, 'callerFuncNames is required')

  // module:
  // ESNext = 99,
  // NodeNext = 199
  const module = ! format || format === 'esm' ? 99 : 1

  // moduleResolution: 99,
  // NodeJs = 2,
  // NodeNext = 99

  const file = createSourceFile(path, {
    tsConfigFilePath,
    compilerOptions: {
      module,
      // moduleResolution: 99,
      // declaration: true,
      // inlineSourceMap: false,
      skipLibCheck: true,
      strictPropertyInitialization: false,
      // sourceMap: false,
    },
  })
  // const file = createSourceFile(path, { tsConfigFilePath })

  const opts: TransFormOptions = {
    // needle: 'genDbDict',
    needle: '',
    leadingString: 'eslint-disable',
    trailingString: 'eslint-enable',
    sourceFile: file,
  }

  callerFuncNames.forEach((needle) => {
    if (! needle) { return }
    opts.needle = needle
    transformCallExpressionToLiteralType(opts)
  })

  // await file.save()
  await file.emit()
  return file.getFilePath()
}


function ifPathContainsKey(path: FilePath, keys: string | string[]): boolean {
  if (! path) { return false }

  if (typeof keys === 'string' && keys) {
    return path.includes(keys)
  }
  else if (Array.isArray(keys)) {
    for (const key of keys) {
      if (key && path.includes(key)) {
        return true
      }
    }
  }

  return false
}

function ifFileContentContainsCallerFuncNames(
  matchFuncNameSet: CallerFuncNameSet,
  maxLines: number,
  path: FilePath,
): Observable<boolean> {

  const line$ = readFileLineRx(path)
  const scan$ = line$.pipe(
    take(maxLines >= 0 ? maxLines : 200),
    map((content) => {
      return hasContainsCallerFuncNames(matchFuncNameSet, content)
    }),
    filter(exists => !! exists),
    catchError(() => of(false)),
    defaultIfEmpty(false),
  )

  // const notExists$ = of(false)
  // const ret$ = concat(scan$, notExists$).pipe(
  //   take(1),
  //   // tap((exists) => {
  //   //   // eslint-disable-next-line no-console
  //   //   console.info(exists)
  //   // }),
  // )

  return scan$
}

function hasContainsCallerFuncNames(
  matchFuncNameSet: CallerFuncNameSet,
  content: string,
): boolean {

  if (content) {
    for (const key of matchFuncNameSet) {
      if (content.includes(key)) {
        return true
      }
    }
  }
  return false
}


// export function parseCallerFuncNames(
//   callerFuncNameSet: CallerFuncNameSet,
//   names: CallerFuncName | CallerFuncName[],
// ): CallerFuncNameSet {

//   const st = new Set(callerFuncNameSet)

//   if (! names) {
//     return st
//   }
//   else if (typeof names === 'string') {
//     st.add(names)
//   }
//   else if (Array.isArray(names) && names.length) {
//     names.forEach(name => st.add(name))
//   }
//   else {
//     throw new TypeError('Value of param invalid.')
//   }

//   return st
// }

