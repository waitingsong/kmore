import { type DbDict, genDbDict } from '../../src/lib/dict.js'
import type { Db } from '../test3.model.js'



export const dict: DbDict<Db> = genDbDict<Db>() // line 6

