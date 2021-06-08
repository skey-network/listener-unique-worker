import fs from 'fs'
import { ChildProcessWithoutNullStreams, spawn, spawnSync } from 'child_process'
import http from 'http'
import { NetworkInterfaceInfo, networkInterfaces } from 'os'

const iotPort = 12345
const basePath = './src/e2e_spec/listener_envs/'
const volumeBasePath = `${process.env.PWD}/src/e2e_spec/listener_envs/`
const perDeviceConfig = `${basePath}config.json`
const envTemplate = `${basePath}.env.template`
const env = `${basePath}.env`
const container_name = 'e2e_listener'

type ListenerConfig = { dappAddr?: string; mode?: 'http' | 'grpc'; fallbackJson?: string }
type IotRequest = { contentJson: any; url: string }
type ExpectedResult = {
  device_address: string | undefined
  action_name: string | undefined
  key_id: string | undefined
  function_name: string | undefined
  device_model: string | undefined
}

class Utils {
  // set ip for auto-generated urls etc
  static readonly ip = process.env.INTERFACE
    ? Utils.getIp(process.env.INTERFACE)
    : undefined

  protected static server: http.Server
  protected static listener: ChildProcessWithoutNullStreams

  protected static setupEnv(config: ListenerConfig) {
    const conf = {
      DAPP: config.dappAddr,
      SILENT_INVOKERS: '',
      LISTENER_MODE: config.mode,
      NODE_URL: process.env.NODE_URL ?? `http://${Utils.ip}:6869`,
      NODE_GRPC_EVENTS: process.env.NODE_GRPC_EVENTS ?? `${Utils.ip}:6881`,
      NODE_GRPC: process.env.NODE_GRPC ?? `${Utils.ip}:6877`,
      IOT_PLATFORM_URL: process.env.IOT_URL ?? `http://${Utils.ip}:${iotPort}`,
      IOT_FALLBACK_JSON: config.fallbackJson
    }

    let text = fs.readFileSync(envTemplate).toString()
    for (const [key, value] of Object.entries(conf)) {
      text = text.replace(new RegExp(`'${key}'`, 'g'), value as string)
    }
    if (config.fallbackJson) {
      text = text.replace(/\#fallback_enable/g, '') // uncomment fallback
    }
    fs.writeFileSync(env, text)
  }

  static dockerizeListener() {
    const result = spawnSync('npm', ['run', 'dockerize'])
    if (result.status != 0) {
      console.error({ result })
      console.error('Cant build listener image')
      process.exit(-1)
    }
  }

  static spawnListener(config: ListenerConfig) {
    this.setupEnv(config)
    this.listener = spawn('docker', [
      'run',
      '--name',
      container_name,
      ...this.volume('config.json'),
      ...this.volume('.env'),
      'supplier-listener'
    ])
    this.listener.stderr.on('data', (data) => {
      console.log(data.toString())
    })
    this.listener.stdout.on('data', (data) => {
      console.log(data.toString())
    })
  }

  static async killListener() {
    spawnSync('docker', ['rm', '-f', container_name])
    await this.delay(2000)
  }

  // mount volume args
  protected static volume(file: string) {
    return ['-v', `${volumeBasePath}${file}:/app/${file}`]
  }

  static createIotServer(callback: (data: IotRequest) => void) {
    const port = process.env.IOT_PORT ?? iotPort
    this.server = http
      .createServer(function (req: any, res: any) {
        let data = ''
        req.on('data', (chunk: any) => {
          data += chunk
        })
        req.on('end', () => {
          const json = JSON.parse(data)
          res.end()
          callback({ url: req.url! || '', contentJson: data })
        })
      })
      .listen(port, function () {
        console.log(`server started at port ${port}`)
      })
  }

  static killIotServer() {
    this.server.close()
  }

  static getIp(interf: string) {
    const nets = networkInterfaces()
    const results = {}
    const interface_name = interf
    const info = nets[interface_name]?.find(
      (x: NetworkInterfaceInfo) => x.family == 'IPv4'
    )
    console.log(info?.address)
    return info?.address
  }

  static buildExpectedRequestResult(args: {
    user?: string
    device?: string
    key?: string
    action?: string
    model?: string
    func?: string
  }): ExpectedResult {
    return {
      device_address: args.device,
      action_name: args.action,
      key_id: args.key,
      function_name: args.func ?? 'deviceAction',
      device_model: args.model
    }
  }

  static async waitUntilAny<T>(array: Array<T>, timeout: number) {
    timeout /= 400
    while (timeout-- > 0 && array.length < 1) {
      process.stdout.write(timeout.toString())
      await this.delay(400)
    }
    process.stdout.write(array.length > 0 ? 'got request' : 'timeout')
    return array.length > 0
  }

  static sortedEntries(obj: object) {
    return Object.entries(obj).sort((a, b) => a[0].localeCompare(b[0]))
  }

  static delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export { Utils, IotRequest, ListenerConfig, ExpectedResult }
