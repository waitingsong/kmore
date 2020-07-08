import { DbDictBase, DbModel } from '../../src'
import { genDbDictFromType } from '../../src/lib/compiler'
import { User, UserDetail } from '../test.model'


export const dbDict31 = genFoo<Db>(0)

interface Db extends DbModel {
  tb_user: User
  tb_user_detail: UserDetail
}


function genFoo<T extends DbModel>(distance: number): DbDictBase<T> {
  return genBar<T>(distance + 1)
}

function genBar<T extends DbModel>(distance: number): DbDictBase<T> {
  const dbDict = genDbDictFromType<T>({
    /**
     * 2: the caller with generics type is up to two level, genFoo() -> fenBar(),
     * 1: up to one level, outer genBar() -> genDbDictFromType(),
     * 0: calling genDbDictFromType() with generics type directly
     */
    callerDistance: distance + 1, // now is 2
  })
  return dbDict
}

