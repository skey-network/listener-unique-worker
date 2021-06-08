import { setupMaster } from 'cluster'
import SkeyLib from 'skey-lib'
import BcAccount from './account'
import sample from 'lodash.sample'
import { Utils } from './utils'
const dapps = require('./dapps.json')
const CLOSE = 'close'
const OPEN = 'open'
const ACTIVE = 'active'
const supplierInDeviceDataKey = 'dapp'

type deviceInfo = { model?: string; account: BcAccount }
type keyInfo = { for: deviceInfo; id: string }
type userInfo = { account: BcAccount; keys: keyInfo[] }

class SupplierDapp {
  chain: string
  dapp!: BcAccount
  devices: deviceInfo[] = []
  users: { account: BcAccount; keys: { for: deviceInfo; id: string }[] }[] = []
  lib: ReturnType<typeof SkeyLib.getInstance>

  static async create(node: string, chain: string) {
    const instance = new SupplierDapp(node, chain)
    await instance.setup()
    return instance
  }

  protected constructor(node: string, chain: string) {
    this.chain = chain
    this.lib = SkeyLib.getInstance({ nodeUrl: node, chainId: chain })
  }

  async setup() {
    await this.createDapp()
  }

  protected async createDapp() {
    this.dapp = new BcAccount(this.lib.createAccount().seed, this.chain)
    const transfRes = await this.lib.transfer(this.dapp.address, 1, process.env.BANK!)
    const setScrRes = await this.lib.setScript(dapps.supplier, this.dapp.seed)
    console.log({ transfRes, setScrRes })
    await this.addUser()
  }

  protected async addDevice(model?: string) {
    const dev = new BcAccount(this.lib.createAccount().seed, this.chain)
    const transfRes = await this.lib.transfer(dev.address, 1, process.env.BANK!)
    const writeToDappRes = await this.lib.insertData(
      [
        { key: `device_${dev.address}`, value: CLOSE },
        {
          key: `device_counter_${dev.address}`,
          value: 0
        }
      ],
      this.dapp.seed
    )
    const writeDataRes = await this.lib.insertData(
      [
        { key: supplierInDeviceDataKey, value: this.dapp.address },
        { key: 'owner', value: this.dapp.address },
        ...(model || Math.random() > 0.5 // place details randomly but only when no model specified, otherwise place it always
          ? [{ key: 'details', value: JSON.stringify({ deviceModel: model }) }]
          : [])
      ],
      dev.seed
    )
    const setScrRes = await this.lib.setScript(dapps.device, dev.seed)
    console.log({ transfRes, writeToDappRes, writeDataRes, setScrRes })
    const devInfo = { account: dev, model: model }
    this.devices.push(devInfo as deviceInfo)
    return devInfo
  }

  protected async addUser() {
    const user = new BcAccount(this.lib.createAccount().seed, this.chain)
    const transfRes = await this.lib.transfer(user.address, 1, process.env.BANK!)
    console.log(transfRes)
    this.users.push({ account: user, keys: [] })
    return user
  }

  protected async addKeyFor(dev: deviceInfo, user: BcAccount) {
    const key = await this.lib.generateKey(
      dev.account.address,
      Date.now() + 3600000,
      this.dapp.seed,
      'SKey'
    )
    const addToDev = await this.lib.insertData(
      [{ key: `key_${key}`, value: ACTIVE }],
      dev.account.seed
    )
    const transfKeyRes = await this.lib.transferKey(user.address, key, this.dapp.seed)
    console.log(transfKeyRes)
    this.users
      .find((x) => x.account.address == user.address)!
      .keys.push({ for: dev, id: key })

    return { for: dev, id: key }
  }

  async randomUserGeneratedDevice(model?: string) {
    const user = sample(this.users)!
    const device = await this.addDevice(model)
    const key = await this.addKeyFor(device, user.account)
    return { user, key }
  }

  createActionResult(
    arg: {
      user: userInfo
      key: keyInfo
    },
    options?: { action?: string; func?: 'deviceAction' | 'deviceActionAs' }
  ) {
    return Utils.buildExpectedRequestResult({
      user: arg.user!.account.address,
      device: arg.key!.for.account.address,
      key: arg.key?.id,
      action: options?.action ?? OPEN,
      func: options?.func ?? 'deviceAction',
      model: arg.key!.for.model ?? 'undefined'
    })
  }

  async doAction(
    arg: { user: userInfo; key: keyInfo },
    options?: { action?: string; org?: string }
  ) {
    const result = await (options?.org
      ? this.lib.interactWithDeviceAs(
          arg.key!.id,
          this.dapp.address,
          options?.action ?? OPEN,
          arg.user!.account.seed,
          options.org
        )
      : this.lib.interactWithDevice(
          arg.key!.id,
          this.dapp.address,
          options?.action ?? OPEN,
          arg.user!.account.seed
        ))
    console.log(`ACTION TX!:${result}`)
  }
}

export default SupplierDapp
