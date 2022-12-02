const exec = require('child_process').exec;
const fs = require("fs");

const dbpath = process.env.DBFILE || "/data/myduck.db";

module.exports = function DB(){

    // Cannot use more than 1 worker if local file is used. 
    // If file is used, env WORKERS will be ignored.
    this._workers = 1; 

    // Set max buffer size for child process. Default is 64MB
    this._maxBuffer = parseInt(process.env.MAX_BUFFER) || 64;

    // Set default pre-query. Can be changed if LOCAL_DB is set as 0.
    this._prequery = "LOAD httpfs;";
    
    // Use file by default. If LOCAL_DB is specified as 0, use only memory
    this._useFile = true;
    if(parseInt(process.env.LOCAL_DB) === 0)
        this._useFile = false;

    // Configure prequery && workers if file is not used
    if(!this._useFile){
        // Add install httpfs to use remote files on prequery
        this._prequery = "INSTALL httpfs;" + this._prequery;
        // Ise 8 workers by default OR env WORKERS
        this._workers = 8;

        // Set env value if env is set
        let workers = parseInt(process.env.WORKERS);
        if(workers >= 1) this._workers = workers;
    }

    console.log("Duckdb instance running on " + this._workers + " workers and using " + (this._useFile ? "file" : "memory") + ".");

    /**
     * Start local duckdb file. Will not be run if LOCAL_DB is set as 0.
     * @returns {Promise|void} void if success otherwise error
     */
    this._createDB = () => {
        return new Promise(async (resolve, reject) => {
            try{
                await this._query('CALL dbgen(sf=0.1)', false);
                await this._query('select 42;', false);
                await this._query('install "httpfs";', false)

                console.log("Duckdb file created.");
                resolve();
            } catch(error){
                reject(error);
            }
        });
    }

    /**
     * Will be run on server startup. Create duckdb file and set s3 credentials.
     * @returns {Promise} this if success otherwise error
     */
    this._startup = () => {
        // prevent multiple execution of startup function
        this._startup = undefined;
        return new Promise(async (resolve) => {
            try{
                // If uses file, verify if dbpath file exists
                if(this._useFile && !fs.existsSync(dbpath))
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

    /**
     * Run query on duckdb via queue
     * @param {string} query query to be executed
     * @returns {Promise} result of query or error
     */
    this.query = (query) => {
        return new Promise((resolve, reject) => {
            this.queue.push(query, (error, result) => {
                if(error)
                    return reject(error);
                resolve(result);
            });
        })
    }

    /**
     * Run query directly on duckdb
     * @param {string} query query to be executed
     * @param {boolean} runPreQuery if true, will add prequery. Default is true.
     * @returns {Promise} result of query or error
     */
    this._query = async (query, runPreQuery = true) => {
        return new Promise((resolve, reject) => {

            query = query.replace(/"/g, '\\"');

            // add httpfs on every session
            if(runPreQuery)
                query = this._prequery + query;

            // execute duckdb query in another process
            exec(
                `duckdb ${this._useFile ? dbpath : ''} -json -c "${query}"`, 
                { maxBuffer: 1024 * 1024 * this._maxBuffer },
                function callback(error, stdout, stderr) {
                if(error || stderr) {
                    error = error || stderr;
                    console.log(error);
                    reject(error);
                }
                resolve(stdout);
            })
        })
    }

    /**
     * Worker function. Will be executed on every query.
     * Required for fastq
     */
    this.worker = (arg, cb) => {
        this._query(arg).then((res) => {
            cb(null, res);
        }).catch((error) => {
            cb(error);
        });
    }

    // Create queue with concurrency 1. Dont change.
    this.queue = require('fastq')(this.worker, this._workers);

    // Test files && prepare s3 data if needed
    return this._startup();
}