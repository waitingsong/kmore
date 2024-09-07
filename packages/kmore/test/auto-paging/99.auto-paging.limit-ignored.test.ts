/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'
import { RecordCamelKeys } from '@waiting/shared-types'

import { KmoreFactory, type PageRawType } from '##/index.js'
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
    it('ignore limit()', async () => {
      const ret: PageRawType<UserDTO> = await tables.tb_user()
        .select('*')
        .limit(1) // will be ignored
        .autoPaging()

      validatePageRet(ret, 3)
    })

  })
})

