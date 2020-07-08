import { basename } from '@waiting/shared-core'
import * as assert from 'power-assert'

import { kmore, Kmore } from '../src/index'

import { config } from './test.config'
import { Db } from './test.model'


const filename = basename(__filename)

describe(filename, () => {
  let km: Kmore<Db>

  before(() => {
    km = kmore<Db>({ config })
    assert(km.tables && Object.keys(km.tables).length > 0)
  })
  after(async () => {
    await km.dbh.destroy() // !
  })

  describe('Should accessing km.<tables> works', () => {
    it('with valid table value', async () => {
      const { tables, rb } = km

      for (const tbAlias of Object.keys(tables)) {
        assert(
          tbAlias && typeof rb[tbAlias] === 'function',
          `Should km.${tbAlias} be typeof function, but not.`,
        )
      }
    })

    it('with valid table value', async () => {
      const { rb } = km;

      [
        Math.random(),
        Math.random().toString(),
        'foo',
        true,
        false,
        null,
        void 0,
        0,
        123,
        Symbol('foo'),
      ].forEach((val) => {
        // @ts-ignore
        assert(typeof rb[val] === 'undefined')

        try {
          // @ts-ignore
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          km[val]()
        }
        catch (ex) {
          return
        }
        assert(false, 'Should throw error during accessing non exists props')
      })
    })
  })

})

