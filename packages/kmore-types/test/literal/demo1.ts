import { genDbDict, DbDict } from '../../src/lib/dict'
import { Db } from '../test3.model'



export const dict: DbDict<Db> = genDbDict<Db>()

