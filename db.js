const exec = require('child_process').exec;
const fs = require("fs");

const dbpath = process.env.DBFILE || "/data/myduck.db";

module.exports = function DB(){

    this._createDB = () => {
        return new Promise(async (resolve, reject) => {
            try{
                await this._query('CALL dbgen(sf=0.1)', false);
                await this._query('select 42;', false);
                await this._query('install "httpfs";', false)

                resolve();
            } catch(error){
                reject(error);
            }
        });
    }

    this._startup = () => {
        // prevent multiple execution of startup function
        this._startup = undefined;
        return new Promise(async (resolve, reject) => {

            try{
                // verify if dbpath file exists
                if(!fs.existsSync(dbpath))
                    await this._createDB();

                // if all data is set, configure s3 data
                if(process.env.S3_REGION && process.env.S3_KEY && process.env.S3_SECRET)
                    await this.query(`
                        SET s3_region='${process.env.S3_REGION}';
                        SET s3_access_key_id='${process.env.S3_KEY}';
                        SET s3_secret_access_key='${process.env.S3_SECRET}';
                    `);

                resolve(this);
            } catch(error){
                throw error;
            }
        });
    }

    this.query = (query) => {
        return new Promise((resolve, reject) => {
            this.queue.push(query, (error, result) => {
                if(error)
                    return reject(error);
                resolve(result);
            });
        })
    }

    this._query = async (query, loadfs = true) => {
        return new Promise((resolve, reject) => {

            query = query.replace(/"/g, '\\"');

            // add httpfs on every session
            if(loadfs)
                query = "LOAD httpfs;" + query;

            // execute duckdb query in another process
            exec(`duckdb ${dbpath} --json "${query}" | jq '.'`, function callback(error, stdout, stderr) {
                if(error || stderr) {
                    error = error || stderr;
                    console.log(error);
                    reject(error);
                }
                resolve(stdout);
            })
        })
    }

    this.worker = (arg, cb) => {
        this._query(arg).then((res) => {
            cb(null, res);
        }).catch((error) => {
            cb(error);
        });
    }

    // create queue with concurrency 1. Dont change.
    this.queue = require('fastq')(this.worker, 1);

    // test files && prepare s3 data if needed
    return this._startup();
}