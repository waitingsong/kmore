import type { DbDict } from '../../src/lib/dict.js'
import { genDbDict } from '../../src/lib/dict.js'
import type { Db, Db2 } from '../test3.model.js'



export const dict1: DbDict<Db> = genDbDict<Db>()
export const dict2: DbDict<Db2> = genDbDict<Db2>()

