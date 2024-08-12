import assert from 'node:assert/strict'

import { fileShortPath } from '@waiting/shared-core'
import type { Kmore } from 'kmore'

import { ConfigKey, Msg } from '##/lib/types.js'
import { testConfig } from '#@/root.config.js'


describe(fileShortPath(import.meta.url), () => {
  const sourceMaster = 'master'
  const sourceTest = 'test'

  before(() => {
    const { trxStatusService } = testConfig
    assert(trxStatusService, 'trxStatusService not exists')
    assert(trxStatusService.getName() === 'trxStatusService', 'trxStatusService.getName() !== trxStatusService')
    const dbCount = trxStatusService.getDbInstanceCount()
    assert(dbCount === 1, `getDbInstanceCount() !== 1, got ${dbCount}`) // default master
  })


  describe(`Should TrxStatusService.getDbInstance() work with only one db instance`, () => {

    it('pass dbSourceName', async () => {
      const { trxStatusService } = testConfig
      assert(trxStatusService.getDbInstance(sourceMaster), 'getDbInstance() failed')
      assert(! trxStatusService.getDbInstance('not-exists'), 'getDbInstance() failed')
    })

    it('pass undefined', async () => {
      const { trxStatusService } = testConfig
      assert(trxStatusService.getDbInstance(sourceMaster), 'getDbInstance() failed')
      assert(! trxStatusService.getDbInstance('not-exists'), 'getDbInstance() failed')
    })

    it('pass blank', async () => {
      const { trxStatusService } = testConfig
      const db = trxStatusService.getDbInstance('')
      assert(db, 'getDbInstance() failed')
      assert(db.dbId === sourceMaster, `${db.dbId} !== ${sourceMaster}`)
    })
  })

  describe(`Should TrxStatusService.getDbInstance() work with multiple db instance`, () => {
    before(() => {
      const { trxStatusService } = testConfig
      assert(trxStatusService, 'trxStatusService not exists')
      trxStatusService.registerDbInstance(sourceTest, { dbId: sourceTest } as Kmore)
    })
    after(() => {
      const { trxStatusService } = testConfig
      assert(trxStatusService, 'trxStatusService not exists')
      trxStatusService.unregisterDbInstance(sourceTest)
    })

    it('pass dbSourceName', async () => {
      const { trxStatusService } = testConfig

      const dbCount = trxStatusService.getDbInstanceCount()
      assert(dbCount === 2, `getDbInstanceCount() !== 2, got ${dbCount}`)

      const names = JSON.stringify(trxStatusService.listDbInstanceNames())

      const dbMaster = trxStatusService.getDbInstance(sourceMaster)
      assert(dbMaster, 'getDbInstance() failed: ' + names)
      assert(dbMaster.dbId === sourceMaster, `${dbMaster.dbId} !== ${sourceMaster}: ` + names)

      const dbTest = trxStatusService.getDbInstance(sourceTest)
      assert(dbTest, 'getDbInstance() failed: ' + names)
      assert(dbTest.dbId === sourceTest, `${dbTest.dbId} !== ${sourceTest}: ` + names)
      assert(! trxStatusService.getDbInstance('not-exists'), 'getDbInstance() failed')
    })

    it('pass undefined', async () => {
      const { trxStatusService } = testConfig
      try {
        trxStatusService.getDbInstance(void 0)
      }
      catch (ex) {
        assert(ex instanceof Error, 'getDbInstance() failed')
        return
      }
      assert(false, 'should not reach here')
    })

    it('pass blank', async () => {
      const { trxStatusService } = testConfig
      try {
        trxStatusService.getDbInstance(void 0)
      }
      catch (ex) {
        assert(ex instanceof Error, 'getDbInstance() failed')
        return
      }
      assert(false, 'should not reach here')
    })
  })
})

