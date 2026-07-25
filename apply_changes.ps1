$Root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $Root

$files = @{
  'server\routes\router.js' = @'
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const router = new express.Router();
const userdb = require("../models/userSchema");
var bcrypt = require("bcryptjs");
const authenticate = require("../middleware/authenticate");
const keysecret = process.env.SECRET_KEY || "secret123";

const fallbackUsers = require("../db/fallbackUsers");

console.log('Server router loaded');

// for user registration

router.post("/register", async (req, res) => {
    const useFallback = mongoose.connection.readyState !== 1;
    const { fname, email, password, cpassword } = req.body;

    if (!fname || !email || !password || !cpassword) {
        return res.status(422).json({ error: "fill all the details" });
    }

    try {
        let preuser;

        if (useFallback) {
            preuser = fallbackUsers.find((user) => user.email === email);
        } else {
            preuser = await userdb.findOne({ email: email });
        }

        if (preuser) {
            return res.status(422).json({ error: "This Email is Already Exist" });
        }

        if (password !== cpassword) {
            return res.status(422).json({ error: "Password and Confirm Password Not Match" });
        }

        if (useFallback) {
            const hashedPassword = await bcrypt.hash(password, 12);
            const newUser = {
                _id: Date.now().toString(),
                fname,
                email,
                password: hashedPassword,
                cpassword: hashedPassword,
                tokens: []
            };
            fallbackUsers.push(newUser);
            return res.status(201).json({ status: 201, storeData: newUser });
        }

        const finalUser = new userdb({
            fname,
            email,
            password,
            cpassword
        });

        const storeData = await finalUser.save();
        return res.status(201).json({ status: 201, storeData });
    } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({ error: "Server error while registering user." });
    }

});




// user Login

router.post("/login", async (req, res) => {
    console.log('Entered /login route - headers=', req.headers);
    const useFallback = mongoose.connection.readyState !== 1;
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(422).json({ error: "Fill all the details" });
    }
    try {
        console.log('Login attempt:', { email, useFallback });
        let userValid;

        if (useFallback) {
            userValid = fallbackUsers.find((user) => user.email === email);
        } else {
            userValid = await userdb.findOne({ email });
        }

        if (!userValid) {
            console.log('Login failed - user not found');
            return res.status(401).json({ error: "User does not exist" });
        }

        console.log('Found user for login:', { id: userValid._id, email: userValid.email });

        const isMatch = await bcrypt.compare(password, userValid.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        if (useFallback) {
            const token = jwt.sign({ _id: userValid._id }, keysecret, {
                expiresIn: "1d"
            });
            userValid.tokens = userValid.tokens || [];
            userValid.tokens.push({ token });
            res.cookie("usercookie", token, {
                expires: new Date(Date.now() + 86400000),
                httpOnly: true
            });
            return res.status(200).json({ token, userValid });
        }

        const token = await userValid.generateAuthtoken();
        res.cookie("usercookie", token, {
            expires: new Date(Date.now() + 86400000), // 1 day
            httpOnly: true
        });
        return res.status(200).json({ token, userValid });
    } catch (error) {
        console.error("Login error:", error && error.stack ? error.stack : error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});



// user valid
router.get("/validuser",authenticate,async(req,res)=>{
    try {
        const ValidUserOne = await userdb.findOne({_id:req.userId});
        res.status(201).json({status:201,ValidUserOne});
    } catch (error) {
        res.status(401).json({status:401,error});
    }
});


// user logout

router.get("/logout",authenticate,async(req,res)=>{
    try {
        req.rootUser.tokens =  req.rootUser.tokens.filter((curelem)=>{
            return curelem.token !== req.token
        });

        res.clearCookie("usercookie",{path:"/"});

        req.rootUser.save();

        res.status(201).json({status:201})

    } catch (error) {
        res.status(401).json({status:401,error})
    }
})


module.exports = router;



// 2 way connection
// 12345 ---> e#@$hagsjd
// e#@$hagsjd -->  12345

// hashing compare
// 1 way connection
// 1234 ->> e#@$hagsjd
// 1234->> (e#@$hagsjd,e#@$hagsjd)=> true
'@

  'server\app.js' = @'
require("dotenv").config();
const express = require("express");
const app = express();
const fs = require('fs');
require("./db/conn");
const router = require("./routes/router");
const cors = require("cors");
const cookiParser = require("cookie-parser")
const port = 8009;


// app.get("/",(req,res)=>{
//     res.status(201).json("server created")
// });

// raw request logger (before body parsing)
app.use((req, res, next) => {
    console.log('REQ RAW:', req.method, req.path);
    next();
});
app.use(express.json());
// parsed-body logger
app.use((req, res, next) => {
    console.log('REQ:', req.method, req.path, 'body=', req.body);
    next();
});

// simple health endpoint
app.get('/health', (req, res) => {
    console.log('Health check received');
    res.json({ ok: true });
});
app.use(cookiParser());
app.use(cors());
app.use(router);

// global error handler to log stack traces
app.use((err, req, res, next) => {
    const text = (err && err.stack ? err.stack : String(err)) + '\n';
    try { fs.appendFileSync('error.log', text); } catch (e) { console.error('Failed to write error.log', e); }
    console.error('Unhandled error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Internal Server Error' });
});


app.listen(port,()=>{
    console.log(`server start at port no : ${port}`);
})
'@

  'server\db\fallbackUsers.js' = @'
const fallbackUsers = [];

module.exports = fallbackUsers;
'@
}

foreach ($path in $files.Keys) {
  $full = Join-Path $Root $path
  $dir = Split-Path $full -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $files[$path] | Out-File -FilePath $full -Encoding UTF8
  Write-Host "Wrote $path"
}

Write-Host "Done. Now run:`n`ngit add -A`n git commit -m \"server: add DB fallback, improve register/login fallback, add request and error logging, add health endpoint\"`n"
