/**
 * 1. Run blockchain node (external)
 * 2. Setup spupplier/devices/users
 * 3. Run listener in docker
 *
 *
 */

import { config } from 'dotenv'
config({ path: 'src/e2e_spec/.env' })

import SupplierDapp from './supplier_dapp'
import { ListenerConfig, Utils, ExpectedResult } from './utils'

jest.setTimeout(3600000)

const nodeUrl = process.env.NODE_URL ?? `http://${Utils.ip}:6869`
const chainId = process.env.CHAIN_ID ?? 'R'

type iotRequest = { contentJson?: any; url: string }

const context: {
  watchedSupplier?: SupplierDapp
  otherSupplier?: SupplierDapp
  iotRequests: iotRequest[] // parsed requests to iot
} = {
  iotRequests: []
}

/**
 * listener_envs/config.js - doesn't change through run
 * - for fmb920/fmb900 there is additional json data: 'rule':'fmb'
 * - for anyDev/testDev there is additional json data: 'rule':'dev'
 *   - for close changes to: 'rule':'dev-close'
 *
 * listener_envs/.env is generated from /listener_envs/.env.template
 * - uncomment debug in template to get debug messages from listener
 *
 * e2e_spec/.env
 * - BANK seed required for mocking suppliers/devices/users etc
 * - optional alternative node configuration (TODO),
 *   by default expects node at ip of interface "wlo1"
 */

/**
 *
 *    CASES
 *
 * Each case constains listener configuration, name and flow
 * Flow consists of function returning optional request and errors (not supported yet)
 * Actions without request shouldnt be placed at end of flow
 *
 * All tests are run in two modes, http & grpc
 *
 *
 */
const cases: {
  name: string // name of case to show in console
  listenerConfig: ListenerConfig
  flow: {
    asyncAction: () => Promise<ExpectedResult | undefined | void>
    error?: string
  }[]
}[] = [
  {
    name: 'No fallback',
    listenerConfig: {},
    flow: [
      {
        // Action on not watched supplier, unknown dev model
        asyncAction: async () => {
          const supplier = context.otherSupplier!

          const rand = await supplier.randomUserGeneratedDevice()
          await supplier.doAction(rand)
        }
      },
      {
        // Action on not watched supplier, supported model
        asyncAction: async () => {
          const supplier = context.otherSupplier!
          const rand = await supplier.randomUserGeneratedDevice('testDev')
          await supplier.doAction(rand)
        }
      },
      {
        // Action on watched supplier, unknown dev model
        asyncAction: async () => {
          const supplier = context.watchedSupplier!
          const rand = await supplier.randomUserGeneratedDevice()
          await supplier.doAction(rand)
          //return supplier.createActionResult(rand)
        }
      },
      {
        // Action on watched supplier, supported model
        asyncAction: async () => {
          const supplier = context.watchedSupplier!
          const rand = await supplier!.randomUserGeneratedDevice('testDev')
          await supplier!.doAction(rand)
          return { ...supplier!.createActionResult(rand), ...{ rule: 'dev' } }
        }
      },
      {
        // Action on watched supplier, supported model, should chose alternative json for close
        asyncAction: async () => {
          const supplier = context.watchedSupplier!
          const rand = await supplier!.randomUserGeneratedDevice('testDev')
          await supplier!.doAction(rand, { action: 'close' })
          return {
            ...supplier!.createActionResult(rand, { action: 'close' }),
            ...{ rule: 'dev-close' }
          }
        }
      }
    ]
  },
  {
    name: 'Fallback',
    listenerConfig: {
      fallbackJson:
        '{"rule":"fallback", "device_address":"{device_address}", "action_name":"{action_name}", "key_id":"{key_id}", "function_name":"{function_name}", "device_model":"{device_model}"}'
    },
    flow: [
      {
        // Action on not watched supplier, unknown dev model
        asyncAction: async () => {
          const supplier = context.otherSupplier!

          const rand = await supplier.randomUserGeneratedDevice()
          await supplier.doAction(rand)
        }
      },
      {
        // Action on not watched supplier, supported model
        asyncAction: async () => {
          const supplier = context.otherSupplier!
          const rand = await supplier.randomUserGeneratedDevice('testDev')
          await supplier.doAction(rand)
        }
      },
      {
        // Action on watched supplier, unknown dev model
        asyncAction: async () => {
          const supplier = context.watchedSupplier!
          const rand = await supplier.randomUserGeneratedDevice()
          await supplier.doAction(rand)
          return { ...supplier!.createActionResult(rand), ...{ rule: 'fallback' } }
        }
      },
      {
        // Action on watched supplier, unsupported dev model
        asyncAction: async () => {
          const supplier = context.watchedSupplier!
          const rand = await supplier.randomUserGeneratedDevice('unsupported')
          await supplier.doAction(rand)
          return { ...supplier!.createActionResult(rand), ...{ rule: 'fallback' } }
        }
      },
      {
        // Action on watched supplier, supported model
        asyncAction: async () => {
          const supplier = context.watchedSupplier!
          const rand = await supplier!.randomUserGeneratedDevice('testDev')
          await supplier!.doAction(rand)
          return { ...supplier!.createActionResult(rand), ...{ rule: 'dev' } }
        }
      },
      {
        // Action on watched supplier, supported model, should chose alternative json for close
        asyncAction: async () => {
          const supplier = context.watchedSupplier!
          const rand = await supplier!.randomUserGeneratedDevice('testDev')
          await supplier!.doAction(rand, { action: 'close' })
          return {
            ...supplier!.createActionResult(rand, { action: 'close' }),
            ...{ rule: 'dev-close' }
          }
        }
      }
    ]
  }
]

/**
 *
 *    TESTS
 *
 */
describe('e2e', () => {
  /**
   * Before each listener run
   *
   * Create docker image of listener
   * Create iot server to receive requests made by listener
   */
  beforeAll(async () => {
    Utils.dockerizeListener()
    Utils.createIotServer((req: iotRequest) => {
      context.iotRequests.push(req)
    })
  })

  /**
   * iterate over modes
   */
  describe.each([
    { mode: 'http', timeForAction: 15000 },
    { mode: 'grpc', timeForAction: 2000 }
  ])('mode: %p', (listenerMode) => {
    /**
     *  Iterate over test cases
     */
    describe.each(cases)('case %#: %p', (testcase) => {
      /**
       * Spawn listener with configuration from current run
       * Create two supplier dapps with devices/users/keys
       */
      beforeAll(async () => {
        // create new suppliers as http mode will parse from at leas 3 blocks before current
        context.watchedSupplier = await SupplierDapp.create(nodeUrl, chainId)
        context.otherSupplier = await SupplierDapp.create(nodeUrl, chainId)

        // spawn listener with given configuration & selected mode
        Utils.spawnListener({
          dappAddr: context.watchedSupplier!.dapp.address,
          mode: listenerMode.mode as 'http' | 'grpc',
          fallbackJson: testcase.listenerConfig.fallbackJson
        }) // async
        await Utils.delay(2000)
      })

      /**
       * Iterate over steps from case
       * Execute function with some action
       * Wait & check for iot response if expectedm check its contents
       */
      test.each(testcase.flow)('step %#', async (step) => {
        const actionResult = await step.asyncAction()
        await Utils.delay(100)
        if (actionResult) {
          await Utils.waitUntilAny(context.iotRequests, listenerMode.timeForAction)
          const iotRequests = context.iotRequests // swap req arrays
          context.iotRequests = []

          // one request per step, if there is more, something wrong happened
          expect(iotRequests.length).toBe(1)

          // expect prepared request to be equal to received request, sorted to fix comparing
          const content = JSON.parse(iotRequests[0].contentJson)

          expect(Utils.sortedEntries(content)).toStrictEqual(
            Utils.sortedEntries(actionResult)
          )
        }
      })

      /**
       * Kill listener after each case, as each case has own configuration
       */
      afterAll(async () => {
        await Utils.killListener()
      })
    })
  })
  /**
   * Test over, kill iot server
   */
  afterAll(() => {
    Utils.killIotServer()
  })
})
