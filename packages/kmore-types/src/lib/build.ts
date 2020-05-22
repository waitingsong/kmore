import { pathResolve, writeFileAsync } from '@waiting/shared-core'
import { Observable } from 'rxjs'
import { mergeMap } from 'rxjs/operators'

import { initBuildSrcOpts, globalCallerFuncNameSet, DbPropKeys } from './config'
import {
  TTables,
  FilePath,
  Tables,
  CallerTbListMap,
  BuildSrcOpts,
  MultiTableCols,
  CallerTypeId,
  MultiTableColsCommon,
  TablesMapArrCommon,
} from './model'
import {
  pickInfoFromCallerTypeId,
  genCallerTypeMapFromNodeSet,
  matchSourceFileWithFilePath,
  walkNode,
} from './ts-util'
import {
  buildTbListParam,
  genTbListTsFilePath,
  genVarName,
  walkDirForCallerFuncTsFiles,
  buildTbColListParam,
} from './util'


/**
 * Generate tables .ts files,
 * no path value emitted if no file generated.
 */
export function buildSource(options: BuildSrcOpts): Observable<FilePath> {
  const opts: Required<BuildSrcOpts> = {
    ...initBuildSrcOpts,
    ...options,
  }

  const walk$ = walkDirForCallerFuncTsFiles(opts)
  const build$ = walk$.pipe(
    mergeMap((path) => {
      return buildSrcTablesFile(path, opts)
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
export async function buildSrcTablesFile<T extends TTables>(
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
      content += code
    })

    if (! path) {
      throw new Error('path value is empty')
    }
    await saveFile(path, content, opts.outputBanner)
    path = path.replace(/\\/ug, '/')
  }

  return path
}

export function retrieveTypeFromTsFile<T extends TTables>(
  file: FilePath,
): CallerTbListMap<T> {

  const path = pathResolve(file).replace(/\\/ug, '/')
  const { checker, sourceFile } = matchSourceFileWithFilePath(path)
  const ret = new Map() as CallerTbListMap<T>

  if (sourceFile) {
    const nodeSet = walkNode({
      sourceFile,
      matchFuncNameSet: globalCallerFuncNameSet,
    })
    const callerTypeMap = genCallerTypeMapFromNodeSet(nodeSet, checker, sourceFile, path)

    callerTypeMap.forEach(([tbListTagMap, tbColListTagMap], callerTypeId) => {
      const tbs: Tables<T> = buildTbListParam<T>(tbListTagMap)
      const mtCols: MultiTableCols<T> = buildTbColListParam<T>(tbColListTagMap)
      ret.set(callerTypeId, [tbs, mtCols])
    })
  }

  return ret
}

export function genTsCodeFromTypes<T extends TTables>(
  callerTypeId: CallerTypeId,
  arr: TablesMapArrCommon<T>,
  options: Required<BuildSrcOpts>,
): [FilePath, string] {

  let path = ''
  const codeArr: string[] = []

  const [str, code] = genTablesTsCodeFromTypes<T>(
    callerTypeId,
    arr[0],
    options.exportVarPrefix,
    DbPropKeys.tables,
    options.outputFileNameSuffix,
  )
  if (! path) {
    path = str // all value are the same one
  }
  codeArr.push(code)

  const [, code2] = genColsTsCodeFromTypes<T>(
    callerTypeId,
    arr[1],
    options.exportVarPrefix,
    DbPropKeys.columns,
    options.outputFileNameSuffix,
  )
  codeArr.push(code2)

  return [path, codeArr.join('\n\n')]
}

export function genTablesTsCodeFromTypes<T extends TTables>(
  callerTypeId: CallerTypeId,
  tables: Tables<T>,
  exportVarPrefix: string,
  exportVarColsSuffix: string,
  outputFileNameSuffix: string,
): [FilePath, string] {

  const { path, line, column } = pickInfoFromCallerTypeId(callerTypeId)
  // const relativePath = relative(base, path)
  const targetPath = genTbListTsFilePath(path, outputFileNameSuffix)

  const tbVarName = genVarName(exportVarPrefix, line, column)
  const tbTableVarName = `${tbVarName}_${exportVarColsSuffix}`
  const code = `export const ${tbTableVarName} = ${JSON.stringify(tables, null, 2)} as const`

  return [targetPath, code]
}

export function genColsTsCodeFromTypes<T extends TTables>(
  callerTypeId: CallerTypeId,
  columns: MultiTableColsCommon<T>,
  exportVarPrefix: string,
  exportVarColsSuffix: string,
  outputFileNameSuffix: string,
): [FilePath, string] {

  const { path, line, column } = pickInfoFromCallerTypeId(callerTypeId)
  // const relativePath = relative(base, path)
  const targetPath = genTbListTsFilePath(path, outputFileNameSuffix)

  const tbVarName = genVarName(exportVarPrefix, line, column)
  const tbColVarName = `${tbVarName}_${exportVarColsSuffix}`
  const code = `export const ${tbColVarName} = ${JSON.stringify(columns, null, 2)} as const`

  return [targetPath, code]
}


/** Save (k)tables of one file */
export async function saveFile(
  path: string,
  code: string,
  outputPrefix: string,
): Promise<FilePath> {

  const retCode = outputPrefix
    ? `${outputPrefix}\n\n${code}\n\n`
    : `${code}\n\n`

  await writeFileAsync(path, retCode)
  return path.replace(/\\/gu, '/')
}

