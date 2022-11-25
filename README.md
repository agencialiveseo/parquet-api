# Parquet-api

Parquet-api is a simple library compatible with AWS S3 that uses DuckDB and Node.js to build a docker api that you can make sql queries using http requests.

The usage is simple as a http request:
> http://my-server:8080/?q=SELECT 2 as abc;

The response is JSON, like:
> [ { "abc": 2 } ]

You need to build docker image to run your service. To run, just run build.sh script and run a docker using run.sh