import { pathResolve, writeFileAsync, isFileExists, unlinkAsync } from '@waiting/shared-core'
import { Observable } from 'rxjs'
import { mergeMap } from 'rxjs/operators'

import { initBuildSrcOpts, globalCallerFuncNameSet } from './config'
import {
  DbModel,
  FilePath,
  Tables,
  CallerDbMap,
  BuildSrcOpts,
  BuildSrcRet,
  DbCols,
  CallerTypeId,
  DbDict,
  TablesMapArr,
  DbDictBase,
} from './model'
import {
  pickInfoFromCallerTypeId,
  genCallerTypeMapFromNodeSet,
  matchSourceFileWithFilePath,
  walkNode,
} from './ts-util'
import {
  buildDbParam,
  genTbListTsFilePath,
  genVarName,
  buildDbColsParam,
  walkDirForCallerFuncTsFiles,
  genDbDictFromBase,
} from './util'


/**
 * Generate dbDict .ts files, for CLI
 * include extra scopedColumns, aliasColumns,
 * for testing.
 * no path value emitted if no file generated.
 */
export function buildSource(options: BuildSrcOpts): Observable<BuildSrcRet> {
  const opts: Required<BuildSrcOpts> = {
    ...initBuildSrcOpts,
    ...options,
  }

  const walk$ = walkDirForCallerFuncTsFiles(opts)
  const build$ = walk$.pipe(
    mergeMap((path) => {
      return buildDbDict(path, opts)
    }, opts.concurrent),
    // defaultIfEmpty(''),
  )

  return build$
}

/**
 * Build dbDict const and type code
 */
export async function buildDbDict<D extends DbModel>(
  file: string,
  options: BuildSrcOpts,
): Promise<BuildSrcRet> {

  const map: CallerDbMap<D> = retrieveTypeFromTsFile<D>(file)
  const dictPath = await buildDbDictFile(file, options, map)
  const DictTypePath = ''

  return { dictPath, DictTypePath }
}


/**
 * Build dbdict code from generics type for ts source file
 *
 * @returns file path if src file need parsed
 */
export async function buildDbDictFile<D extends DbModel>(
  file: string,
  options: BuildSrcOpts,
  callerDbMap?: CallerDbMap<D>,
): Promise<BuildSrcRet['dictPath']> {

  const opts: Required<BuildSrcOpts> = {
    ...initBuildSrcOpts,
    ...options,
  }

  await unlinkBuildFile(file, opts)

  let path = ''
  let content = ''
  const map: CallerDbMap<D> = callerDbMap ? callerDbMap : retrieveTypeFromTsFile<D>(file)

  if (map.size) {
    map.forEach((arr, key) => {
      const kdd = genDbDict(arr)

      const [str, dbDictCode] = genDbDictConst(key, kdd, opts)
      if (! path) {
        path = str // all value are the same one
      }
      content += `${dbDictCode}\n\n`
    })

    if (! path) {
      throw new Error('path value is empty')
    }
    await appendDataToFile(path, content, opts.outputBanner)
    path = path.replace(/\\/ug, '/')
  }

  return path
}


function retrieveTypeFromTsFile<T extends DbModel>(
  file: FilePath,
): CallerDbMap<T> {

  const path = pathResolve(file).replace(/\\/ug, '/')
  const { checker, sourceFile } = matchSourceFileWithFilePath(path)
  const ret = new Map() as CallerDbMap<T>

  if (sourceFile) {
    const nodeSet = walkNode({
      sourceFile,
      matchFuncNameSet: globalCallerFuncNameSet,
    })
    const callerTypeMap = genCallerTypeMapFromNodeSet(nodeSet, checker, sourceFile, path)

    callerTypeMap.forEach(([dbTagMap, dbColsTagMap], callerTypeId) => {
      const tbs: Tables<T> = buildDbParam<T>(dbTagMap)
      const mtCols: DbCols<T> = buildDbColsParam<T>(dbColsTagMap)
      ret.set(callerTypeId, [tbs, mtCols])
    })
  }

  return ret
}

function genDbDictConst<T extends DbModel>(
  callerTypeId: CallerTypeId,
  dbDict: DbDict<T>,
  options: Required<BuildSrcOpts>,
): [FilePath, string] {

  const { path, line, column } = pickInfoFromCallerTypeId(callerTypeId)
  // const relativePath = relative(base, path)
  const targetPath = genTbListTsFilePath(path, options.outputFileNameSuffix)

  const dbDictVarName = genVarName(options.exportVarPrefix, line, column)
  const code = `export const ${dbDictVarName} = ${JSON.stringify(dbDict, null, 2)} as const`

  return [targetPath, code]
}


function genDbDict<D extends DbModel>(arr: TablesMapArr<D>): DbDict<D> {
  const [tables, columns] = arr
  const base: DbDictBase<D> = {
    tables,
    columns,
  }
  const kdd = genDbDictFromBase(base)
  return kdd
}


/** Save (k)tables of one file */
async function appendDataToFile(
  path: string,
  code: string,
  outputPrefix: string,
): Promise<FilePath> {

  const retCode = outputPrefix
    ? `${outputPrefix}\n\n${code}\n\n`
    : `${code}\n\n`

  await writeFileAsync(path, retCode, { flag: 'a' })
  return path.replace(/\\/gu, '/')
}

/**
 * Unlink (k)tables file starting with path,
 * create if not exists, empty if exists
 */
async function unlinkBuildFile(
  path: string,
  options: Required<BuildSrcOpts>,
): Promise<string> {

  const target = genTbListTsFilePath(path, options.outputFileNameSuffix)

  if (await isFileExists(target)) {
    await unlinkAsync(target)
  }

  return path
}

