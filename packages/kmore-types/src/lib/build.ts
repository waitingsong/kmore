import { pathResolve, writeFileAsync } from '@waiting/shared-core'
import { mergeMap } from 'rxjs/operators'
import { Observable, defer } from 'rxjs'

import {
  TTables,
  FilePath,
  Tables,
  CallerTbListMap,
  BuildSrcOpts,
  MultiTableCols,
} from './model'
import {
  buildTbListParam,
  genTbListTsFilePath,
  genVarName,
  walkDirForCallerFuncTsFiles,
  buildTbColListParam,
} from './util'
import { initBuildSrcOpts, globalCallerFuncNameSet } from './config'
import {
  pickInfoFromCallerTypeId,
  genCallerTypeMapFromNodeSet,
  matchSourceFileWithFilePath,
  walkNode,
} from './ts-util'


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
      return defer(() => buildSrcTablesFile(path, opts))
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

  const ret: CallerTbListMap<T> = retrieveTypeFromTsFile<T>(file)
  if (ret && ret.size) {
    const path = await saveFile<T>(ret, opts)
    return path.replace(/\\/gu, '/')
  }
  else {
    return ''
  }
}

function retrieveTypeFromTsFile<T extends TTables>(
  file: FilePath,
): CallerTbListMap<T> {

  const path = pathResolve(file).replace(/\\/gu, '/')
  const { checker, sourceFile } = matchSourceFileWithFilePath(path)
  const ret: CallerTbListMap<T> = new Map()

  if (sourceFile) {
    const nodeSet = walkNode({
      sourceFile,
      matchFuncNameSet: globalCallerFuncNameSet,
    })
    const callerTypeMap = genCallerTypeMapFromNodeSet(nodeSet, checker, sourceFile, path)

    callerTypeMap.forEach(([tbListTagMap, tbColListTagMap], callerTypeId) => {
      const tbs: Tables<T> = buildTbListParam<T>(tbListTagMap)
      const tbCols: MultiTableCols<T> = buildTbColListParam<T>(tbColListTagMap)
      ret.set(callerTypeId, [tbs, tbCols])
    })
  }

  return ret
}

function genTsCodeFromTypes<T extends TTables>(
  inputMap: CallerTbListMap<T>,
  options: Required<BuildSrcOpts>,
): [FilePath, string] {

  const {
    exportVarPrefix,
    exportVarColsSuffix,
    outputFileNameSuffix,
  } = options
  let targetPath = ''
  const sourceArr: string[] = []

  inputMap.forEach(([tbs, tbCols], key) => {
    const { path, line, column } = pickInfoFromCallerTypeId(key)

    if (! targetPath) {
      // const relativePath = relative(base, path)
      targetPath = genTbListTsFilePath(path, outputFileNameSuffix)
    }

    const tbVarName = genVarName(exportVarPrefix, line, column)
    const tbColVarName = `${tbVarName}${exportVarColsSuffix}`

    sourceArr.push(`export const ${tbVarName} = ${JSON.stringify(tbs, null, 2)} as const`)
    sourceArr.push(`export const ${tbColVarName} = ${JSON.stringify(tbCols, null, 2)} as const`)
  })

  return [targetPath, sourceArr.join('\n\n')]
}


/** Save tables of one file */
async function saveFile<T extends TTables>(
  inputMap: CallerTbListMap<T>,
  options: Required<BuildSrcOpts>,
): Promise<FilePath> {

  const { outputBanner: outputPrefix } = options
  const [path, code] = genTsCodeFromTypes<T>(inputMap, options)
  const retCode = outputPrefix
    ? `${outputPrefix}\n\n${code}\n\n`
    : `${code}\n\n`

  await writeFileAsync(path, retCode)
  return path.replace(/\\/gu, '/')
}

