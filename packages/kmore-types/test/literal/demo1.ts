import type { DbDict } from '../../src/lib/dict.js'
import { genDbDict } from '../../src/lib/dict.js'
import type { Db } from '../test3.model.js'



export const dict: DbDict<Db> = genDbDict<Db>()

