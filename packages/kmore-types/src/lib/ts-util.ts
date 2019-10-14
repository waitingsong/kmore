/* eslint-disable @typescript-eslint/no-require-imports */
// eslint-disable-next-line import/no-extraneous-dependencies
import {
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
import { pathResolve } from '@waiting/shared-core'

import { isCallerNameMatched } from './util'
import {
  CallerTypeIdInfo,
  CallerTypeId,
  CallerTypeMap,
  GenInfoFromNodeOps,
  LocalTypeId,
  TbListTagMap,
  MatchedSourceFile,
  WalkNodeWithPositionOps,
  WalkNodeOps,
} from './model'


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
  sourceFile: SourceFile,
  path: string,
): CallerTypeMap {

  const retMap: CallerTypeMap = new Map()

  nodes.forEach((node) => {
    const obj = genInfoFromNode({
      node, checker, sourceFile, retMap, path,
    })
    if (obj) {
      retMap.set(obj.id, obj.tagMap)
    }
  })

  return retMap
}

function genInfoFromNode(options: GenInfoFromNodeOps): { id: LocalTypeId, tagMap: TbListTagMap } | void {
  const {
    node, checker, sourceFile, retMap, path,
  } = options

  /* istanbul ignore else */
  if (node) {
    const typeName: Identifier | void = retrieveGenericsIdentifierFromTypeArguments(node)

    /* istanbul ignore else */
    if (typeName && typeName.getText()) {
      const gType = checker.getTypeAtLocation(typeName)

      /* istanbul ignore else */
      if (gType && gType.symbol) {
        // @ts-ignore
        const typeid: number = typeof gType.id === 'number' ? gType.id : Math.random()
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
        const localTypeId = `${path}:${line + 1}:${character + 1}:typeid-${typeid}`

        if (retMap.has(localTypeId)) {
          return
        }
        else {
          const tagMap: TbListTagMap = genTbListTagMapFromSymbol(gType.symbol)
          /* istanbul ignore else */
          if (tagMap.size) {
            return { id: localTypeId, tagMap }
          }
        }
      }
    }
  }
}

// ---- compiler ---

export function genTbListTagMapFromSymbol(symbol: TsSymbol): TbListTagMap {
  const { members } = symbol
  // Map<TableAlias, Map<TagName, TagComment> >
  const symbolTagMap: TbListTagMap = new Map()

  /* istanbul ignore else */
  if (members) {
    members.forEach((member) => {
      const name = member.getName()
      const tags: JSDocTagInfo[] = member.getJsDocTags()
      // tags can be empty array
      symbolTagMap.set(name, tags)
    })
  }

  return symbolTagMap
}


export function retrieveGenericsIdentifierFromTypeArguments(node: CallExpression): Identifier | void {
  /* istanbul ignore else */
  if (! node.typeArguments || node.typeArguments.length !== 1) {
    return
  }
  const [typeNode] = node.typeArguments
  // @ts-ignore
  return typeNode.typeName
}



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

