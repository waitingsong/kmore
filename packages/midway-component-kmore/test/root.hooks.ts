import { ConfigKey } from '##/index.js'
import { mwConfig } from '#@/config.unittest.js'
import { testConfig } from '#@/root.config.js'


/**
 * @see https://mochajs.org/#root-hook-plugins
 * beforeAll:
 *  - In serial mode(Mocha’s default ), before all tests begin, once only
 *  - In parallel mode, run before all tests begin, for each file
 * beforeEach:
 *  - In both modes, run before each test
 */
export const mochaHooks = async () => {

  return {
    // beforeAll: async () => {
    //   const globalConfig = {
    //     keys: Math.random().toString(),
    //     [ConfigKey.middlewareConfig]: mwConfig,
    //     [ConfigKey.config]: kmoreConfig,
    //   }
    //   const opts = {
    //     imports: [WEB],
    //     globalConfig,
    //   }
    //   const app = await createApp(join(__dirname, 'fixtures', 'base-app'), opts) as Application
    //   app.addConfigObject(globalConfig)
    //   testConfig.app = app
    //   testConfig.httpRequest = createHttpRequest(app)
    //   const { url } = testConfig.httpRequest.get('/')
    //   testConfig.host = url

    //   testConfig.container = app.getApplicationContext()
    //   // const svc = await testConfig.container.getAsync(TaskQueueService)
    //   // https://midwayjs.org/docs/testing
    // },


    afterEach: async () => {
      const { app } = testConfig
      app.addConfigObject({
        [ConfigKey.middlewareConfig]: mwConfig,
      })
    },

  }

}

