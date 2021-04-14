import { genDbDict, DbDict } from '../../src/lib/dict'
import { Db, Db2 } from '../test3.model'



export const dict1: DbDict<Db> = genDbDict<Db>()
export const dict2: DbDict<Db2> = genDbDict<Db2>()

