import * as Crypto from '@waves/ts-lib-crypto'

class Account {
  seed: string
  chain: string

  constructor(seed: string, chain?: string) {
    this.seed = seed
    this.chain = chain ?? 'R'
  }

  get address() {
    return Crypto.address(this.seed, this.chain)
  }

  get publicKey() {
    return Crypto.publicKey(this.seed)
  }

  get privateKey() {
    return Crypto.privateKey(this.seed)
  }
}

export default Account
