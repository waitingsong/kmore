/* eslint-disable import/no-extraneous-dependencies */
import { writeFileAsync, readFileAsync, isFileExists } from '@waiting/shared-core'
import * as ts from 'typescript'

import {
  DbDict,
  Tables,
  DbCols,
  DbAliasCols,
  TableAliasCols,
  FilePath,
} from './model'


export async function updateDbDictFile(
  targetPath: FilePath,
  code: string,
  dbDictExportNameToCheck: string,
): Promise<FilePath> {

  await checkDbDictNameDup(targetPath, dbDictExportNameToCheck)
  const str = `\n${code.trim()}\n`.replace(/ {4}/ug, '  ')
  await writeFileAsync(targetPath, str, { flag: 'a' })

  return targetPath
}

async function checkDbDictNameDup(
  targetPath: FilePath,
  dbDictExportName: string,
): Promise<void> {

  if (! await isFileExists(targetPath)) {
    return
  }

  const buf = await readFileAsync(targetPath)
  const code = buf.toString()
  const needle = `export interface ${dbDictExportName}`

  if (code.length && code.includes(needle)) {
    throw new Error(
      `type name dbDictExportName: "${dbDictExportName}" already exists in the file: "${targetPath}",
      file content: ${code}
      `,
    )
  }
}

/**
 * Generate DbDict type declaration code from dbDict variable
 *
 * @returns ```ts
 * export interface DbDict {....}
 * ```
 */
export function genDbDictTypeDeclaration(
  dbDict: DbDict,
  dbDictExportName = 'DbDict',
): string {

  // const targetPath = './.kmore-debug.ts'
  // const srcCode = 'const dbDict = ' + JSON.stringify(dbDict)
  // const ast2 = ts.createSourceFile(
  //   targetPath,
  //   srcCode,
  //   ts.ScriptTarget.ESNext,
  //   false,
  // )
  // const str2 = JSON.stringify(ast2.statements, null, 2)
  // const printer = ts.createPrinter()
  // const codeAfterTransform = printer.printFile(ast2)
  // console.info(codeAfterTransform)

  const srcCode = `export interface ${dbDictExportName} {}`

  let ast = ts.createSourceFile(
    '',
    srcCode,
    ts.ScriptTarget.ESNext,
    false,
  )

  const tablesTypeNode = genTablesNode(dbDict.tables)
  ast = updateSourceFile('tables', tablesTypeNode, ast, dbDictExportName)

  const colsTypeNode = genColsNode(dbDict.columns)
  ast = updateSourceFile('columns', colsTypeNode, ast, dbDictExportName)

  const scopedColsTypeNode = genColsNode(dbDict.scopedColumns)
  ast = updateSourceFile('scopedColumns', scopedColsTypeNode, ast, dbDictExportName)

  const aliasColsTypeNode = genAliasColsNode(dbDict.aliasColumns)
  ast = updateSourceFile('aliasColumns', aliasColsTypeNode, ast, dbDictExportName)

  const code = ts.createPrinter().printFile(ast)
  const ret = code.replace(/\r\n/ug, '\n').replace(/\r/ug, '\n')
  return ret
}

function genTablesNode(
  tables: Tables,
): ts.TypeLiteralNode {

  const ret = genLiteralTypeElements(tables)
  return ret
}

/**
 * LiteralTypeElement of returns
 * @returns ```ts
 * key: value
 * ```
 */
function genLiteralTypeElement(item: TypeLiteralItem): ts.TypeElement {
  const [key, value] = item

  const token = ts.createStringLiteral(value)
  const typeNode = ts.createLiteralTypeNode(token)
  const typeElm: ts.PropertySignature = ts.createPropertySignature(
    undefined,
    ts.createIdentifier(key),
    undefined,
    typeNode,
    undefined,
  )
  return typeElm
}

/**
 * @returns ```ts
 * tb_user: {
 *  uid: 'uid',
 *  name: 'name',
 * },
 * tb_user_detail: {},
 * ```
 */
function genColsNode(
  rows: DbCols | TableAliasCols,
): ts.TypeLiteralNode {

  const nodes: ts.PropertySignature[] = []

  Object.entries(rows).forEach(([key, items]) => {
    const itemType = genLiteralTypeElements(items)
    const node: ts.PropertySignature = ts.createPropertySignature(
      undefined,
      ts.createIdentifier(key),
      undefined,
      itemType,
      undefined,
    )
    nodes.push(node)
  })

  const ret = ts.createTypeLiteralNode(nodes)
  if (! ts.isTypeLiteralNode(ret)) {
    throw new TypeError('Result is NOT TypeLiteralNode')
  }
  return ret
}

/**
 * @returns ```ts
 * tb_user: {
 *  uid: {
 *    tbUserUid: 'tb_user.uid'
 *  }
 *  name: {
 *    tbUserName: 'tb_user.name'
 *  }
 * },
 * tb_user_detail: {},
 * ```
 */
function genAliasColsNode(
  rows: DbAliasCols,
): ts.TypeLiteralNode {

  const nodes: ts.PropertySignature[] = []

  Object.entries(rows).forEach(([key, items]) => {
    const itemType = genColsNode(items)
    const node: ts.PropertySignature = ts.createPropertySignature(
      undefined,
      ts.createIdentifier(key),
      undefined,
      itemType,
      undefined,
    )
    nodes.push(node)
  })

  const ret = ts.createTypeLiteralNode(nodes)
  if (! ts.isTypeLiteralNode(ret)) {
    throw new TypeError('Result is NOT TypeLiteralNode')
  }
  return ret
}


/**
 *
 * {
 *  uid: 'uid',
 *  name: 'name',
 * }
 */
function genLiteralTypeElements(
  row: TypeLiteralItems,
): ts.TypeLiteralNode {

  const typeElms: ts.TypeElement[] = []

  Object.entries(row).forEach((item) => {
    const typeElm = genLiteralTypeElement(item)
    typeElms.push(typeElm)
  })

  const ret = ts.createTypeLiteralNode(typeElms)
  return ret
}


/**
 * uid: 'uid' or tb_user: 'tb_user'
 */
type TypeLiteralItem = [string, string]
/**
 * {
 *  uid: 'uid',
 *  name: 'name',
 * }
 */
interface TypeLiteralItems {
  [key: string]: string
}


function updateSourceFile(
  key: keyof DbDict,
  value: ts.TypeLiteralNode,
  ast: ts.SourceFile,
  dbDictExportName: string,
): ts.SourceFile {

  const transformerFactory = (
    ctx: ts.TransformationContext,
  ): ts.Transformer<ts.Node> => {

    const visitor = (node: ts.Node): ts.Node => {
      if (ts.isInterfaceDeclaration(node)) {
        if (node.name.text !== dbDictExportName) {
          return node
        }

        const typeElm: ts.TypeElement = ts.createPropertySignature(
          undefined,
          ts.createIdentifier(key),
          undefined,
          value,
          undefined,
        )
        const decla = ts.updateInterfaceDeclaration(
          node,
          undefined,
          node.modifiers, // [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
          node.name,
          [],
          [],
          [...node.members, typeElm],
        )

        return decla
      }

      return ts.visitEachChild(node, visitor, ctx)
    }

    return visitor
  }

  const ret = ts.transform<ts.Node>(ast, [transformerFactory])
  const sourceFileRet = ret.transformed[0] as ts.SourceFile | undefined
  if (! sourceFileRet) {
    throw new Error('result error')
  }
  // const printer = ts.createPrinter()
  // const codeAfterTransform = printer.printNode(ts.EmitHint.Unspecified, sourceFileRet, ast)
  // console.info({ codeAfterTransform })
  return sourceFileRet
}

