const express = require('express');
const db = require('./db.js');

(new db()).then((db) => {
    // start application
    const app = express();
    const port = 8080;

    // add simple authentication
    if(process.env.TOKEN?.length)
        app.use((req, res, next) => {
            if(req.headers.token != process.env.TOKEN)
                return res.status(401).send("Unauthorized");
            next();
        });

    // add default route
    app.get('/', async (req, res) => {
        if(!req.query.q)
            return res.status(400).send({error: "missing_query", error_details: "usage: /?q=select 2;"});
    
        try{
            let result = await db.query(req.query.q);
            res.send(result);
        } catch(error){
            console.log(error);
            return res.status(500).send({error: "internal_error", error_details: error});
        }
    });
    
    app.listen(port, () => {
        console.log(`Duckdb server is listenin on port ${port}`);
    });

}).catch((error) => {
    console.error(error);
    process.exit(1);
});