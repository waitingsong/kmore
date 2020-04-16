/* eslint-disable @typescript-eslint/no-require-imports */
import { pathResolve } from '@waiting/shared-core'
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  createProgram as createProgramOri,
  isCallExpression as isCallExpressionOri,
  forEachChild as forEachChildOri,
  CallExpression,
  Declaration,
  JSDocTagInfo,
  Identifier,
  Node,
  PropertySignature,
  SourceFile,
  Symbol as TsSymbol,
  TypeChecker,
  TypeNode,
} from 'typescript'

import {
  CallerTypeIdInfo,
  CallerTypeId,
  CallerTypeMap,
  ColListTagMap,
  GenInfoFromNodeOps,
  LocalTypeId,
  TbListTagMap,
  TbColListTagMap,
  MatchedSourceFile,
  WalkNodeWithPositionOps,
  WalkNodeOps,
  TbTagsMap,
} from './model'
import { isCallerNameMatched } from './util'


/**
 *
 * @param id <path>:<line>:<col>:typeid-<typeName>
 */
export function pickInfoFromCallerTypeId(id: CallerTypeId): CallerTypeIdInfo {
  const matched = id.match(/^(.+):(\d+):(\d+):typeid-([\d\w]+)$/u)

  if (matched && matched.length === 5) {
    const ret: CallerTypeIdInfo = {
      path: matched[1],
      line: +matched[2],
      column: +matched[3],
      typeId: matched[4],
    }
    return ret
  }

  throw new TypeError('CallerTypeId value invalid')
}


export function genCallerTypeMapFromNodeSet(
  nodes: Set<CallExpression>,
  checker: TypeChecker,
  sourceFile: SourceFile, // sourceFileObject
  path: string, // .ts file
): CallerTypeMap {

  const retMap: CallerTypeMap = new Map()

  nodes.forEach((node) => {
    const obj = genInfoFromNode({
      checker,
      node,
      path,
      sourceFile,
    })
    if (obj) {
      const { callerTypeId, tbTagMap, tbColTagMap } = obj
      retMap.set(callerTypeId, [tbTagMap, tbColTagMap])
    }
  })

  return retMap
}

interface GenInfoFromNodeRet extends Omit<TbTagsMap, 'tbScopedColTagMap'> {
  callerTypeId: CallerTypeId
  localTypeId: LocalTypeId
}

export function genInfoFromNode(
  options: GenInfoFromNodeOps,
): GenInfoFromNodeRet | void {

  const {
    node, checker, sourceFile, path,
  } = options

  if (! node.typeArguments || ! node.typeArguments[0]) {
    return
  }

  // const typeName: Identifier | void = retrieveGenericsIdentifierFromTypeArguments(node)
  // if (typeName && typeName.getText()) {
  //   const gType = checker.getTypeAtLocation(typeName)
  // }
  const gType = checker.getTypeFromTypeNode(node.typeArguments[0])
  // const props = checker.getPropertiesOfType(type2)

  /* istanbul ignore else */
  if (gType && gType.symbol) {
    const sym = gType.getSymbol()
    if (! sym) {
      return
    }

    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())

    const inputTypeName = sym.getName()
    // "/kmore-mono/packages/kmore-types/test/config/test.config2.ts:4:1:typeid-TbListModel"
    const callerTypeId = `${path}:${line + 1}:${character + 1}:typeid-${inputTypeName}`

    // @ts-ignore
    // const gTypeId: number = typeof gType.id === 'number' ? gType.id : Math.random()
    // "/kmore-mono/packages/kmore-types/test/config/test.config2.ts:typeid-76"
    // "/kmore-mono/packages/kmore-types/test/config/test.config2.ts:typeid-TbListModel"
    const localTypeId = `${path}:typeid-${inputTypeName}`

    const { tbTagMap, tbColTagMap } = genTbListTagMapFromSymbol(sym, checker)
    /* istanbul ignore else */
    if (tbTagMap.size) {
      return {
        callerTypeId,
        localTypeId,
        tbTagMap,
        tbColTagMap,
      }
    }
  }
}

// ---- compiler ---

function genTbListTagMapFromSymbol(
  symbol: TsSymbol,
  checker: TypeChecker,
): Omit<TbTagsMap, 'tbScopedColTagMap'> {

  const { members } = symbol
  // Map<TableAlias, Map<TagName, TagComment> >
  const tbTagMap: TbListTagMap = new Map()
  const tbColTagMap: TbColListTagMap = new Map()
  // const tbScopedColTagMap: TbScopedColListTagMap = new Map()

  /* istanbul ignore else */
  if (members) {
    members.forEach((tbSym: TsSymbol) => {
      const { name: tbName, tags } = retrieveInfoFromSymbolObject(tbSym)
      // tags can be empty array
      tbTagMap.set(tbName, tags)

      const nodes: Declaration[] | undefined = tbSym.getDeclarations()
      if (nodes && nodes.length) {
        const colTagMap = genColListTagMapFromTbSymbol(nodes, checker)
        tbColTagMap.set(tbName, colTagMap)
      }
    })
  }

  return { tbTagMap, tbColTagMap }
}

function genColListTagMapFromTbSymbol(
  nodes: Declaration[],
  checker: TypeChecker,
): ColListTagMap {

  const ret: ColListTagMap = new Map()
  const [node] = nodes // use only one

  if (typeof (node as PropertySignature).type === 'object') {
    const typeRef = (node as PropertySignature).type

    if (typeRef && typeRef.getText()) {
      return retrieveMembersFromTypeRef(typeRef, checker)
    }
  }

  return ret
}

function retrieveMembersFromTypeRef(
  typeRef: TypeNode, // TypeReference
  checker: TypeChecker,
): ColListTagMap {

  const ret: ColListTagMap = new Map()
  const gType = checker.getTypeAtLocation(typeRef)

  /* istanbul ignore else */
  if (gType && gType.symbol) {
    const sym = gType.getSymbol()
    if (sym) {
      const { members } = sym
      if (members) {
        members.forEach((member) => {
          const { name: colName, tags } = retrieveInfoFromSymbolObject(member)
          ret.set(colName, tags)
        })
      }
    }
  }

  return ret
}

function retrieveInfoFromSymbolObject(
  symbol: TsSymbol,
): {name: string, tags: JSDocTagInfo[] } {
  return {
    name: symbol.getName(),
    tags: symbol.getJsDocTags(),
  }
}


// function retrieveGenericsIdentifierFromTypeArguments(node: CallExpression): Identifier | void {
//   /* istanbul ignore else */
//   if (! node.typeArguments || node.typeArguments.length !== 1) {
//     return
//   }
//   // typeNode TypeReference = 169
//   const [typeNode] = node.typeArguments
//   // @ts-ignore
//   return typeNode.typeName
// }


export function matchSourceFileWithFilePath(
  path: string,
): MatchedSourceFile {
  // eslint-disable-next-line import/no-extraneous-dependencies
  const { createProgram } = require('typescript') as {
    createProgram: typeof createProgramOri,
  }

  const srcPath = pathResolve(path).replace(/\\/gu, '/')
  const srcLower = srcPath.toLowerCase()
  const program = createProgram(
    [srcPath],
    {
      noEmitOnError: true,
      noImplicitAny: true,
      // target: ScriptTarget.ESNext,
      target: 99,
      inlineSourceMap: false,
      // module: ModuleKind.CommonJS,
      module: 1,
    },
  )
  const ret: MatchedSourceFile = {
    // ! otherwise node.getText() will fail
    checker: program.getTypeChecker(),
    sourceFile: null,
  }

  for (const sourceFile of program.getSourceFiles()) {
    /* istanbul ignore else */
    if (! sourceFile.isDeclarationFile) {
      // @ts-ignore
      const srcFilePath = sourceFile.path ? sourceFile.path : ''

      if (srcFilePath.toLowerCase() === srcLower) {
        ret.sourceFile = sourceFile
        break
      }
    }
  }

  return ret
}


/** Retrieve node with specified position from caller */
export function walkNodeWithPosition(options: WalkNodeWithPositionOps): CallExpression | void {
  // eslint-disable-next-line import/no-extraneous-dependencies
  const { isCallExpression, forEachChild } = require('typescript') as {
    isCallExpression: typeof isCallExpressionOri,
    forEachChild: typeof forEachChildOri,
  }

  const visit = (node: Node, opts: WalkNodeWithPositionOps): CallExpression | void => {
    const { line, character } = opts.sourceFile.getLineAndCharacterOfPosition(node.getStart())

    /* istanbul ignore else */
    if (line + 1 === opts.matchLine && character + 1 === opts.matchColumn) {
      /* istanbul ignore else */
      if (isCallExpression(node)) {
        const expression = node.expression as Identifier | void

        if (expression) {
          return node
        }

        return // stop walk
      }
    }
    // void else continue walk

    /* istanbul ignore else */
    if (node.getChildCount()) {
      return forEachChild(node, childNode => visit(childNode, opts))
    }
  } // End of visit

  const targetNode = forEachChild(options.sourceFile, node => visit(node, options))
  return targetNode
}


/** Retrieve node with specified matchFuncName */
export function walkNode(options: WalkNodeOps): Set<CallExpression> {
  // eslint-disable-next-line import/no-extraneous-dependencies
  const { isCallExpression, forEachChild } = require('typescript') as {
    isCallExpression: typeof isCallExpressionOri,
    forEachChild: typeof forEachChildOri,
  }

  const ret: Set<CallExpression> = new Set()

  const visitor = (node: Node, opts: WalkNodeOps): void => {
    /* istanbul ignore else */
    if (isCallExpression(node)) {
      const expression = node.expression as Identifier | void

      /* istanbul ignore else */
      if (expression) {
        /* istanbul ignore else */
        if (isCallerNameMatched(expression.getText(), options.matchFuncNameSet)) {
          ret.add(node)
          return
        } // void else
      } // void else
    } // void else continue walk

    /* istanbul ignore else */
    if (node.getChildCount()) {
      forEachChild(node, childNode => visitor(childNode, opts))
    }
  } // End of visit

  forEachChild(options.sourceFile, node => visitor(node, options))
  return ret
}

