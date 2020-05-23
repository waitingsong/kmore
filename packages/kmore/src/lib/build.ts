import {
  walkDirForCallerFuncTsFiles,
  retrieveTypeFromTsFile,
  genTsCodeFromTypes,
  saveFile,
  TablesMapArr,
  KTablesBase,
  genColsTsCodeFromTypes,
  DbPropKeys,
} from 'kmore-types'
import { Observable, defer } from 'rxjs'
import { mergeMap } from 'rxjs/operators'

import { initBuildSrcOpts } from './config'
import {
  TTables,
  FilePath,
  CallerTbListMap,
  BuildSrcOpts,
  KTables,
} from './model'
import { genKTablesFromBase } from './util'


/**
 * Generate kTables .ts files,
 * include extra scopedColumns, aliasColumns,
 * for testing.
 * no path value emitted if no file generated.
 */
export function buildKTablesSource(options: BuildSrcOpts): Observable<FilePath> {
  const opts: Required<BuildSrcOpts> = {
    ...initBuildSrcOpts,
    ...options,
  }

  const walk$ = walkDirForCallerFuncTsFiles(opts)
  const build$ = walk$.pipe(
    mergeMap((path) => {
      return defer(() => buildKTablesFile(path, opts))
    }, opts.concurrent),
    // defaultIfEmpty(''),
  )

  return build$
}



/**
 * Build tables in ts from generics type for specified ts file
 *
 * @returns file path if src file need parsed
 */
export async function buildKTablesFile<T extends TTables>(
  file: string,
  options: BuildSrcOpts,
): Promise<FilePath> {

  const opts: Required<BuildSrcOpts> = {
    ...initBuildSrcOpts,
    ...options,
  }

  let path = ''
  let content = ''
  const map: CallerTbListMap<T> = retrieveTypeFromTsFile<T>(file)

  if (map.size) {
    map.forEach((arr, key) => {
      const [str, code] = genTsCodeFromTypes<T>(key, arr, opts)
      if (! path) {
        path = str // all value are the same one
      }
      content += code + '\n\n'

      const kts = genKTables(arr)
      const [, code2] = genColsTsCodeFromTypes<T>(
        key,
        kts.scopedColumns,
        opts.exportVarPrefix,
        DbPropKeys.scopedColumns,
        opts.outputFileNameSuffix,
      )
      content += code2 + '\n\n'


      const [, code3] = genColsTsCodeFromTypes<T>(
        key,
        kts.aliasColumns,
        opts.exportVarPrefix,
        DbPropKeys.aliasColumns,
        opts.outputFileNameSuffix,
      )
      content += code3 + '\n\n'
    })

    if (! path) {
      throw new Error('path value is empty')
    }
    await saveFile(path, content, opts.outputBanner)
    path = path.replace(/\\/ug, '/')
  }

  return path
}

function genKTables<T extends TTables>(arr: TablesMapArr<T>): KTables<T> {
  const [tables, columns] = arr
  const kTabesBase: KTablesBase<T> = {
    tables,
    columns,
  }
  const kts = genKTablesFromBase(kTabesBase)
  return kts
}

