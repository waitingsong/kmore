import {
  pathResolve,
  writeFileAsync,
  isFileExists,
  unlinkAsync,
  readFileAsync,
} from '@waiting/shared-core'
import { Observable } from 'rxjs'
import { mergeMap, filter } from 'rxjs/operators'

import { initBuildSrcOpts, globalCallerFuncNameSet } from './config'
import { genDbDictTypeDeclaration } from './db-dict'
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
  genDbDictTsFilePath,
  genVarName,
  buildDbColsParam,
  walkDirForCallerFuncTsFiles,
  genDbDictFromBase,
  genDbDictTypeTsFilePath,
  genDictTypeNameFromCallerId,
  includeExportTypeName,
  hasSameDictVar,
  genDictVarNameFromDictTypeName,
  retrieveDictInfoByDictConst,
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
    mergeMap(path => buildDbDict(path, opts), opts.concurrent),
    filter(paths => paths.dictPath.length > 0 && paths.DictTypePath.length > 0),
    // defaultIfEmpty(''),
  )

  return build$
}

/**
 * Build dbDict const and type code
 */
export async function buildDbDict<D extends DbModel = DbModel>(
  file: string,
  options: BuildSrcOpts,
): Promise<BuildSrcRet> {

  let dictPath = ''
  let DictTypePath = ''

  const srcFile = file.replace(/\\/ug, '/')
  const dbMap: CallerDbMap<D> = retrieveTypeFromTsFile<D>(file)
  if (dbMap.size) {
    dictPath = await buildDbDictFile(srcFile, options, dbMap)
    if (dictPath.length) {
      DictTypePath = await buildDbDictTypeFile(srcFile, options, dbMap)
    }
  }

  return { dictPath, DictTypePath }
}

/**
 * Build dbdict code from generics type for ts source file
 *
 * @returns file path if src file need parsed
 */
async function buildDbDictFile<D extends DbModel>(
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

/**
 * Build dbdict code from generics type for ts source file
 *
 * @returns file path if src file need parsed
 */
async function buildDbDictTypeFile<D extends DbModel>(
  srcFile: string,
  options: BuildSrcOpts,
  callerDbMap?: CallerDbMap<D>,
): Promise<BuildSrcRet['DictTypePath']> {

  const opts: Required<BuildSrcOpts> = {
    ...initBuildSrcOpts,
    ...options,
  }

  const targetPath = await genDbDictTypeTsFilePath(
    srcFile,
    opts.DictTypeFolder,
    opts.DictTypeFileName,
  )
  let targetFileContent = ''
  if (await isFileExists(targetPath)) {
    targetFileContent = (await readFileAsync(targetPath)).toString()
  }
  const DictTypeBanner = targetFileContent.includes(opts.DictTypeBanner.trim())
    ? ''
    : opts.DictTypeBanner

  let content = ''
  const map: CallerDbMap<D> = callerDbMap ? callerDbMap : retrieveTypeFromTsFile<D>(srcFile)

  if (map.size) {
    map.forEach((tablesMapArr, callerId) => {
      content = content + genDbDictTypeCode({
        srcFile,
        callerId,
        tablesMapArr,
        DictTypeSuffix: opts.DictTypeSuffix,
        targetPath,
        targetFileContent,
        content,
      }) + '\n'
    })

    if (content.trim().length) {
      await appendDataToFile(targetPath, content, DictTypeBanner)
    }
  }

  return targetPath.replace(/\\/ug, '/')
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
  const targetPath = genDbDictTsFilePath(path, options.outputFileNameSuffix)

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
 * Unlink dbDict const file starting with path,
 * create if not exists, empty if exists
 */
async function unlinkBuildFile(
  path: string,
  options: Required<BuildSrcOpts>,
): Promise<string> {

  const target = genDbDictTsFilePath(path, options.outputFileNameSuffix)

  if (await isFileExists(target)) {
    await unlinkAsync(target)
  }

  return path
}


function validateContentHasDupTypeName(opts: {
  srcFile: string,
  targetPath: string,
  targetFileContent: string,
  typeName: string,
  content: string,
}): void {

  if (includeExportTypeName(opts.targetFileContent, opts.typeName)) {
    const msg = `Build warn:
Target file has same typeName: "${opts.typeName}" but different type declaration in the source file, use other generics input name, or create type alias of the type and pass the alias as generics param. Like:
"
type DbAlias = Db
export const dbDict = genDbDictFromType<DbAlias>()
",
source: "${opts.srcFile}",
target file name: "${opts.targetPath}",
target file content:
------- target content start ------------

${opts.targetFileContent}

------- target content end ------------
        `
    throw new TypeError(msg)
  }
  else if (includeExportTypeName(opts.content, opts.typeName)) {
    const msg = `Build warn:
Duplicate typeName: "${opts.typeName}" but different type declaration in the source file, use other generics input name, or create type alias of the type and pass the alias as generics param. Like:,
"
type DbAlias = Db
export const dbDict = genDbDictFromType<DbAlias>()
",
source: "${opts.srcFile}",
content:
------- content start ------------

${opts.content}

------- content end ------------
        `
    throw new TypeError(msg)
  }
}


function genDbDictTypeCode<D extends DbModel>(options: {
  srcFile: string,
  callerId: string,
  tablesMapArr: TablesMapArr<D>,
  DictTypeSuffix: NonNullable<BuildSrcOpts['DictTypeSuffix']>,
  targetPath: string,
  targetFileContent: string,
  content: string,
}): string {

  const {
    callerId,
    tablesMapArr,
    DictTypeSuffix,
    content,
    targetFileContent,
    srcFile,
    targetPath,
  } = options

  let ret = ''

  const kdd = genDbDict(tablesMapArr)
  const dictTypeName = genDictTypeNameFromCallerId(callerId, DictTypeSuffix)
  const dictVarName = genDictVarNameFromDictTypeName(dictTypeName)
  let writeDictConst = true

  if (hasSameDictVar(targetFileContent, kdd)) {
    if (includeExportTypeName(targetFileContent, dictTypeName)) {
      console.info(
        `Build notice:
message: skip write data, taregetFileContent already has same DictType: "${dictTypeName}",
srcFile: "${srcFile}",
targetPath: "${targetPath}".
        `,
      )
      return ''
    }
    else {
      // same generics type declaration but different type name, so create an ref type instead of write same type once more
      // const dictTypeNameAlias = genValidDictTypeAliasName(
      //   targetFileContent,
      //   dictTypeName,
      // )
      const info = retrieveDictInfoByDictConst(targetFileContent, kdd)
      if (info.dictTypeName) {
        return `export type ${dictTypeName} = ${info.dictTypeName}`
      }
      else {
        // only dict var, no DictType, strange. go down to create type declaration
        writeDictConst = false
      }
    }
  }
  else if (hasSameDictVar(content, kdd)) {
    return ''
  }
  else {
    validateContentHasDupTypeName({
      srcFile, targetPath, targetFileContent, typeName: dictTypeName, content,
    })
  }

  const code = genDbDictTypeDeclaration(kdd, dictTypeName).trim()
  const code2 = code.replace(/ {4}/ug, '  ')
  if (writeDictConst) {
    // ! code must one line w/o new line
    const code3 = `export const ${dictVarName} = ` + JSON.stringify(kdd, null, 0).replace(/\n|\r/ug, '')
    ret += `${code2}\n${code3}`
  }
  else {
    ret += `${code2}`
  }

  return ret.trim()
}

