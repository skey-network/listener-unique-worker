import Redis from 'redis'

type RedisConnectionOptions = {
  /** exit app after n seconds of problems with redis, to disable: 0/undefined */
  exitAfterRedisProblemSec?: number
  /** exit app after n unsuccessfull connections in row, to disable: 0/undefined */
  exitAfterRedisConnectionErrors?: number
}

class RedisConnection {
  static CreateClient(options: RedisConnectionOptions) {
    const redis = new Redis.RedisClient({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      retry_strategy: (strategyOptions) => {
        return this.retryStrategy(strategyOptions, options)
      }
    })
    return redis
  }

  protected static retryStrategy(
    strategyOptions: any /*RedisSMQ.RetryStrategyOptions*/,
    connectionOptions: RedisConnectionOptions
  ) {
    if (strategyOptions.error && strategyOptions.error.code === 'ECONNREFUSED') {
      console.log('Redis refused the connection')
    }
    if (
      connectionOptions.exitAfterRedisProblemSec &&
      strategyOptions.total_retry_time > connectionOptions.exitAfterRedisProblemSec * 1000
    ) {
      console.log('Redis Retry time exhausted')
      process.exit(1)
    }
    if (
      connectionOptions.exitAfterRedisConnectionErrors &&
      strategyOptions.attempt > connectionOptions.exitAfterRedisConnectionErrors
    ) {
      console.log('Redis connect attempts exhausted')
      process.exit(1)
    }
    console.log(`Redis retrying ${strategyOptions.attempt}`)
    return Math.min(strategyOptions.attempt * 100, 3000)
  }
}

export { RedisConnection, RedisConnectionOptions }
