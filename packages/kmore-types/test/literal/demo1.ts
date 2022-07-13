import { genDbDict, DbDict } from '../../src/lib/dict.js'
import { Db } from '../test3.model.js'



export const dict: DbDict<Db> = genDbDict<Db>()

