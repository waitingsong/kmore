/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable no-bitwise */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
import { pathResolve } from '@waiting/shared-core'
import type {
  createProgram as createProgramType,
  isCallExpression as isCallExpressionType,
  isTypeLiteralNode as isTypeLiteralNodeType,
  isTypeReferenceNode as isTypeReferenceNodeType,
  forEachChild as forEachChildType,
  CallExpression,
  JSDocTagInfo,
  Identifier,
  Node,
  SourceFile,
  Symbol as TsSymbol,
  TypeChecker,
  TypeReferenceNode,
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
  const matched = /^(.+):(\d+):(\d+):typeid-([\d\w]+)$/u.exec(id)

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

  const retMap = new Map() as CallerTypeMap

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
): GenInfoFromNodeRet | undefined {

  const {
    node, checker, sourceFile, path,
  } = options

  if (! node.typeArguments) {
    return
  }
  // console.info(node.getSourceFile().fileName)

  // if (ts.isIdentifier(node)) {
  //   const sym = checker.getSymbolAtLocation(node)
  // }

  const typeRefNode = retrieveTypeRefNodeFromGenerics(node)
  const gType = checker.getTypeAtLocation(typeRefNode.typeName)
  // const gType = checker.getTypeFromTypeNode(refTypeNode)
  // const props = checker.getPropertiesOfType(type2)
  const sym = gType.getSymbol()
  /* istanbul ignore else */
  if (! sym) {
    return
  }

  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
  const inputTypeName = sym.getName()
  // "/kmore-mono/packages/kmore-types/test/config/test.config2.ts:4:1:typeid-TbListModel"
  const callerTypeId = `${path}:${line + 1}:${character + 1}:typeid-${inputTypeName}`
  // const gTypeId: number = typeof gType.id === 'number' ? gType.id : Math.random()
  // "/kmore-mono/packages/kmore-types/test/config/test.config2.ts:typeid-76"
  // "/kmore-mono/packages/kmore-types/test/config/test.config2.ts:typeid-TbListModel"
  const localTypeId = `${path}:typeid-${inputTypeName}`

  const { tbTagMap, tbColTagMap } = genTbListTagMapFromSymbol(checker, sym)
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


function genTbListTagMapFromSymbol(
  checker: TypeChecker,
  symbol: TsSymbol,
): Omit<TbTagsMap, 'tbScopedColTagMap'> {

  const { members } = symbol
  // Map<TableAlias, Map<TagName, TagComment> >
  const tbTagMap = new Map() as TbListTagMap
  const tbColTagMap = new Map() as TbColListTagMap
  // const tbScopedColTagMap: TbScopedColListTagMap = new Map()

  /* istanbul ignore else */
  if (members) {
    members.forEach((tbNameSym: TsSymbol) => {
      const { name: tbName, tags } = retrieveInfoFromSymbolObject(tbNameSym)
      // tags can be empty array
      tbTagMap.set(tbName, tags)

      // fields
      const colTagMap = genColListTagMapFromTbSymbol(checker, tbNameSym)
      tbColTagMap.set(tbName, colTagMap)
    })
  }

  return { tbTagMap, tbColTagMap }
}


function genColListTagMapFromTbSymbol(
  checker: TypeChecker,
  tbNameSym: TsSymbol,
): ColListTagMap {

  const ret = new Map() as ColListTagMap
  const tbType = checker.getTypeOfSymbolAtLocation(tbNameSym, tbNameSym.valueDeclaration)
  const sym = tbType.getSymbol()

  /* istanbul ignore else */
  if (sym && sym.members) {
    sym.members.forEach((member) => {
      const { name: colName, tags } = retrieveInfoFromSymbolObject(member)
      ret.set(colName, tags)
    })
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


/**
 * Retrieve TypeReferenceNode
 * @example genTbListFromType<TbListModel>()
 */
function retrieveTypeRefNodeFromGenerics(
  node: CallExpression,
): TypeReferenceNode {

  // eslint-disable-next-line import/no-extraneous-dependencies
  const {
    isTypeReferenceNode,
    isTypeLiteralNode,
  } = require('typescript') as {
    isTypeReferenceNode: typeof isTypeReferenceNodeType,
    isTypeLiteralNode: typeof isTypeLiteralNodeType,
  }

  if (! node.typeArguments || node.typeArguments.length !== 1) {
    throw new TypeError('Generics param required, like genTbListFromType<TbListModel>()')
  }
  const [typeNode] = node.typeArguments
  // typeNode TypeReference = 169
  if (isTypeReferenceNode(typeNode)) {
    return typeNode
  }
  else if (isTypeLiteralNode(typeNode)) {
    throw new TypeError(`Literal Type param not supported, such as
    genTbListFromType<{ tb_user: { uid: number } }>(),
    should be an TypeReference like: genTbListFromType<TbListModel>(),
    `)
  }
  else {
    throw new TypeError(`Not supported TypeNode Kind: ${node.kind}`)
  }
}


export function matchSourceFileWithFilePath(
  path: string,
): MatchedSourceFile {
  // eslint-disable-next-line import/no-extraneous-dependencies
  const { createProgram } = require('typescript') as {
    createProgram: typeof createProgramType,
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
      /* istanbul ignore else */
      if (sourceFile.fileName.toLowerCase() === srcLower) {
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
    isCallExpression: typeof isCallExpressionType,
    forEachChild: typeof forEachChildType,
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
    isCallExpression: typeof isCallExpressionType,
    forEachChild: typeof forEachChildType,
  }

  const ret = new Set<CallExpression>()

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

