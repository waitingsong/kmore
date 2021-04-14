import { genDbDict } from 'kmore-types'

import { Db, Db2 } from './types'


export const dict1 = genDbDict<Db>()
export const dict2 = genDbDict<Db2>()

