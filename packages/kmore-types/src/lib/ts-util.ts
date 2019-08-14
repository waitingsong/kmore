// eslint-disable-next-line import/no-extraneous-dependencies
import * as ts from 'typescript'
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
 * @param id <path>:<line>:<col>:typeid-<typeid>
 */
export function pickInfoFromCallerTypeId(id: CallerTypeId): CallerTypeIdInfo {
  const matched = id.match(/^(.+):(\d+):(\d+):typeid-(\d+)$/u)

  if (matched && matched.length === 5) {
    const ret: CallerTypeIdInfo = {
      path: matched[1],
      line: +matched[2],
      column: +matched[3],
      typeId: +matched[4],
    }
    return ret
  }

  throw new TypeError('CallerTypeId value invalid')
}


export function genCallerTypeMapFromNodeSet(
  nodes: Set<ts.CallExpression>,
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
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
    const typeName: ts.Identifier | void = retrieveGenericsIdentifierFromTypeArguments(node)

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

export function genTbListTagMapFromSymbol(symbol: ts.Symbol): TbListTagMap {
  const { members } = symbol
  // Map<TableAlias, Map<TagName, TagComment> >
  const symbolTagMap: TbListTagMap = new Map()

  /* istanbul ignore else */
  if (members) {
    members.forEach((member) => {
      const name = member.getName()
      const tags: ts.JSDocTagInfo[] = member.getJsDocTags()
      // tags can be empty array
      symbolTagMap.set(name, tags)
    })
  }

  return symbolTagMap
}


export function retrieveGenericsIdentifierFromTypeArguments(node: ts.CallExpression): ts.Identifier | void {
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

  const srcPath = pathResolve(path).replace(/\\/gu, '/')
  const srcLower = srcPath.toLowerCase()
  const program = ts.createProgram(
    [srcPath],
    {
      noEmitOnError: true,
      noImplicitAny: true,
      target: ts.ScriptTarget.ESNext,
      inlineSourceMap: false,
      module: ts.ModuleKind.CommonJS,
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
      }
    }
  }

  return ret
}


/** Retrieve node with specified position from caller */
export function walkNodeWithPosition(options: WalkNodeWithPositionOps): ts.CallExpression | void {
  const visit = (node: ts.Node, opts: WalkNodeWithPositionOps): ts.CallExpression | void => {
    const { line, character } = opts.sourceFile.getLineAndCharacterOfPosition(node.getStart())

    /* istanbul ignore else */
    if (line + 1 === opts.matchLine && character + 1 === opts.matchColumn) {
      /* istanbul ignore else */
      if (ts.isCallExpression(node)) {
        const expression = node.expression as ts.Identifier | void

        if (expression) {
          return node
        }

        return // stop walk
      }
    }
    // void else continue walk

    /* istanbul ignore else */
    if (node.getChildCount()) {
      return ts.forEachChild(node, childNode => visit(childNode, opts))
    }
  } // End of visit

  const targetNode = ts.forEachChild(options.sourceFile, node => visit(node, options))
  return targetNode
}


/** Retrieve node with specified matchFuncName */
export function walkNode(options: WalkNodeOps): Set<ts.CallExpression> {
  const ret: Set<ts.CallExpression> = new Set()

  const visitor = (node: ts.Node, opts: WalkNodeOps): void => {
    /* istanbul ignore else */
    if (ts.isCallExpression(node)) {
      const expression = node.expression as ts.Identifier | void

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
      ts.forEachChild(node, childNode => visitor(childNode, opts))
    }
  } // End of visit

  ts.forEachChild(options.sourceFile, node => visitor(node, options))
  return ret
}

