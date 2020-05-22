/* eslint-disable no-bitwise */
/* eslint-disable @typescript-eslint/no-require-imports */
import { pathResolve } from '@waiting/shared-core'
// eslint-disable-next-line import/no-extraneous-dependencies
import type {
  createProgram as createProgramOri,
  isCallExpression as isCallExpressionOri,
  forEachChild as forEachChildOri,
  CallExpression,
  JSDocTagInfo,
  Identifier,
  Node,
  SourceFile,
  Symbol as TsSymbol,
  TypeChecker,
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
): GenInfoFromNodeRet | void {

  const {
    node, checker, sourceFile, path,
  } = options

  if (! node.typeArguments) {
    return
  }
  // console.info(node.getSourceFile().fileName)

  // const typeName: Identifier | void = retrieveGenericsIdentifierFromTypeArguments(node)
  // if (typeName && typeName.getText()) {
  //   const gType = checker.getTypeAtLocation(typeName)
  // }
  const gType = checker.getTypeFromTypeNode(node.typeArguments[0])
  // const props = checker.getPropertiesOfType(type2)
  const sym = gType.getSymbol()

  /* istanbul ignore else */
  if (sym) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())

    const inputTypeName = sym.getName()
    // "/kmore-mono/packages/kmore-types/test/config/test.config2.ts:4:1:typeid-TbListModel"
    const callerTypeId = `${path}:${line + 1}:${character + 1}:typeid-${inputTypeName}`

    // // @ts-expect-error
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
}

// ---- compiler ---

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
  if (sym?.members) {
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
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const srcFilePath = typeof sourceFile.path === 'string'
        // @ts-expect-error
        ? sourceFile.path
        : ''

      if ((srcFilePath as string).toLowerCase() === srcLower) {
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

