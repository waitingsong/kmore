import { genDbDict } from 'kmore-types'

import { Db, Db2 } from './demo/types.js'


export const expectedDict1 = genDbDict<Db>()
export const expectedDict2 = genDbDict<Db2>()

