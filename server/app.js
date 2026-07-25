require("dotenv").config();
const express = require("express");
const app = express();
const logger = require("./utils/logger");
require("./db/conn");
const router = require("./routes/router");
const cors = require("cors");
const cookiParser = require("cookie-parser")
const port = 8009;


// app.get("/",(req,res)=>{
//     res.status(201).json("server created")
// });

// request logging (only emits in non-production by default)
app.use((req, res, next) => {
    logger.debug(`REQ RAW: ${req.method} ${req.path}`);
    next();
});
app.use(express.json());
app.use((req, res, next) => {
    logger.debug(`REQ: ${req.method} ${req.path} body=${JSON.stringify(req.body)}`);
    next();
});

// simple health endpoint
app.get('/health', (req, res) => {
    logger.info('Health check received');
    res.json({ ok: true });
});
app.use(cookiParser());
app.use(cors());
app.use(router);

// global error handler to log stack traces
app.use((err, req, res, next) => {
    logger.error(err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Internal Server Error' });
});


app.listen(port,()=>{
    logger.info(`server start at port no : ${port}`);
})