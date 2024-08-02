import assert from 'node:assert'

import { fileShortPath } from '@waiting/shared-core'

import { type BuilderProcessorOptions, type Kmore, KmoreFactory } from '##/index.js'
import { config, dbDict } from '#@/test.config.js'
import type { Db } from '#@/test.model.js'


let flag = 1

describe(fileShortPath(import.meta.url), () => {
  let km: Kmore<Db>

  before(() => {
    km = KmoreFactory({ config: config, dict: dbDict, builderPreProcessors: [processor] })
    assert(km.dict.tables && Object.keys(km.dict.tables).length > 0)
  })

  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should work', () => {
    it('builderPreProcessor', async () => {
      const { tb_user } = km.refTables

      assert(flag === 1)
      const ret = await tb_user().select('*')
      assert(ret)
      // @ts-expect-error changed
      assert(flag === 2, 'builderPreProcessor not work, flag not be modified')
    })
  })

})


function processor(options: BuilderProcessorOptions): BuilderProcessorOptions {
  assert(flag === 1)
  flag = 2
  return options
}

