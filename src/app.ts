#!/usr/bin/node
import dotenv from 'dotenv'
import fetch, { Headers } from 'node-fetch'
import { exit } from 'process'
import http from 'http'
import YargsParser from 'yargs-parser'
import fs from 'fs'
import Filter from './filter'

///////////////////////////////////// check for env /////////////////////////////
const args = YargsParser(process.argv.slice(2))
let PerDeviceConfig

let denvResult
if (args['env-file']) {
  denvResult = dotenv.config({ path: args['env-file'] })
} else {
  dotenv.config()
}

try {
  PerDeviceConfig = JSON.parse(
    fs.readFileSync(args['config-file'] ?? './config.json').toString()
  )
} catch (ex) {
  console.log(ex.code)
  if (ex.code == 'ENOENT') {
    console.log('Per device confuguration file (config.json) not found. Ignoring')
  } else {
    console.log('Per device confuguration file (config.json) broken or inaccessible')
    exit()
  }
  PerDeviceConfig = []
}

////////////////////////////////////// dummy server, in case docker hosting requires one in container ////////////////////////////////

if (process.env.PORT) {
  const startServer = () => {
    http
      .createServer((req, res) => {
        res.statusCode = 204
        res.end()
      })
      .listen(Number(process.env.PORT))
      .on('listening', () => console.log(`Dummy server started at ${process.env.PORT}`))
  }
  startServer()
}

////////////////////////////////////// main app /////////////////////////////////
console.log('Started')

const filter = new Filter()
