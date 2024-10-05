
import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'
import { RecordCamelKeys } from '@waiting/shared-types'

import { type PageRawType, KmoreFactory } from '##/index.js'
import { config, dbDict } from '#@/test.config.js'
import type { UserDTO } from '#@/test.model.js'

import { validatePageRet, validatePageRetPartial, validateRet } from './util.js'


describe(fileShortPath(import.meta.url), () => {
  const km = KmoreFactory({ config, dict: dbDict })
  const colkeys: (keyof UserDTO)[] = ['uid', 'realName']

  const tables = km.camelTables
  const uid = 1

  before(() => {
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should autoPaging work', () => {
    it('orderBy ASC', async () => {
      const ret: PageRawType<UserDTO> = await tables.tb_user()
        .select('*')
        .orderBy('uid', 'asc')
        .autoPaging()

      validatePageRet(ret, 3)
      console.info({ ret })
      for (let i = 0; i < ret.length; i += 1) {
        const row = ret[i]
        assert(row, 'Should not be null')
        const idx = i + 1
        assert(row.uid === idx, `uid: ${row.uid}, i: ${idx}`)
      }
    })

    it('orderBy DESC', async () => {
      const ret: PageRawType<UserDTO> = await tables.tb_user()
        .select('*')
        .orderBy('uid', 'desc')
        .autoPaging()

      validatePageRet(ret, 3)
      console.info({ ret })
      const len = ret.length
      for (let i = 0; i < len; i += 1) {
        const row = ret[i]
        assert(row, 'Should not be null')
        const idx = len - i
        assert(row.uid === idx, `uid: ${row.uid}, i: ${idx}`)
      }
    })

  })
})

