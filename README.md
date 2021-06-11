# Supplier Listener - Unique Worker

Filters unique actions by transaction id between `Blockchain Workers` and `Iot Workers`

# Running from sources

Required packages: `nodejs`, `npm` (prefered instalation via `nvm`)

1. Clone repository
2. Navigate to iot-worker folder
3. Install dependencies `npm install`
4. Copy `.env.example` as `.env`, and modify it's contents as in [Configuration file section](#configuration-file).
5. Run command `npm start`

# Building and running docker image

## Build

Execute command in project directory:

```
docker build -t supplier-listener-unique-worker .
```

Result should look like:

```
(...)
Successfully built IMAGE_ID
```

## Run

To run image execute (config.json and docker env as file or params are required):

```
docker run -i <place docker envs here> IMAGE_ID
```

If there is no env specified `Unique Worker` will stop execution.

## Build and run

All in one command which will build image and run it (ensure that path to config is correct)

```
docker run -i <place docker envs here> `docker build -q .`
```

# Configuration file

- Running from sources - it will expect .env & config.json in project folder
- Running in docker container - path to config.json file should be provided as described in [this section](Building-and-running-docker-image), including rest of env specified as docker env file or parameters

## Redis

Redis server address

```
REDIS_HOST="127.0.0.1"
```

Redis server port

```
REDIS_PORT="6379"
```

## Debug info

Enables debug messages, COMMENT OUT do DISABLE

```
DEBUG=true
```
