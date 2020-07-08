import { genDbDictFromType, DbDict, DbModel, DbDictBase } from '../../src/index'
import { User, UserDetail } from '../test.model'


export const dbDict4 = genFoo<Db>()
export const dbDict4Empty = {} as DbDictBase<Db>
export const dbDict4Base: DbDictBase<Db> = {
  tables: dbDict4.tables,
  columns: dbDict4.columns,
}

export interface Db extends DbModel {
  tb_user: User
  tb_user_detail: UserDetail
}


function genFoo<T extends DbModel>(): DbDict<T> {
  const dbDict = genDbDictFromType<T>({
    /**
     * 1: the caller with generics type is up to one level, genFoo() -> genDbDictFromType(),
     * 0: calling genDbDictFromType() with generics type directly
     */
    callerDistance: 1,
  })
  return dbDict
}

