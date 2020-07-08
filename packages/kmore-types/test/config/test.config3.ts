import { DbDictBase, DbModel } from '../../src'
import { genDbDictFromType } from '../../src/lib/compiler'
import { User, UserDetail } from '../test.model'


export const dbDict3 = genFoo<Db>(0)

interface Db extends DbModel {
  tb_user: User
  tb_user_detail: UserDetail
}


function genFoo<T extends DbModel>(distance: number): DbDictBase<T> {
  const dbDict = genDbDictFromType<T>({
    /**
     * 1: the caller with generics type is up to one level, genFoo() -> genDbDictFromType(),
     * 0: calling genDbDictFromType() with generics type directly
     */
    callerDistance: distance + 1, // now is 1
  })
  return dbDict
}

