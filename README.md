# Parquet-api

Parquet-api is a simple library compatible with AWS S3 that uses DuckDB and Node.js to build a docker api that you can make sql queries using http requests.

The usage is simple as a http request:
> http://my-server:8080/?q=SELECT 2 as abc;

The response is JSON, like:
> [ { "abc": 2 } ]

You need to build docker image to run your service or use docker package [liveseo/parquet-api](https://hub.docker.com/r/liveseo/parquet-api). 
To build docker, just execute build.sh script and run a docker using run.sh

| ENVIRONMENT VARIABLE | Description | Default value |
| -------------------- | ----------- | ------------- |
| TOKEN | Used for headers authentication. If set, send header Token:yourtoken | - |
| DBFILE | Location of duckdb local database. Only used if LOCAL_DB is 1 | /data/myduck.db |
| MAX_BUFFER | Size in MB for child node process of duckdb. | 64 |
| LOCAL_DB | 1 to use local persistent db file or 0 to use only memory | 1 |
| WORKERS | Total of workers. Only used if LOCAL_DB is 0 | 1 |
| S3_REGION | S3 region. Example: sa-east-1 | - |
| S3_KEY | S3 key. Example: mys3key | - |
| S3_SECRET | S3 secret. Example: mys3secret | - |
