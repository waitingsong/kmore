import { type DbDict, genDbDict } from '../../src/lib/dict.js'
import type { Db, Db2 } from '../test3.model.js'



export const dict1: DbDict<Db> = genDbDict<Db>() // line 6
export const dict2: DbDict<Db2> = genDbDict<Db2>()

