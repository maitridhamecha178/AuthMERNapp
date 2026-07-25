const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const router = new express.Router();
const userdb = require("../models/userSchema");
var bcrypt = require("bcryptjs");
const authenticate = require("../middleware/authenticate");
const keysecret = process.env.SECRET_KEY || "secret123";

const fallbackUsers = require("../db/fallbackUsers");
const logger = require("../utils/logger");

logger.info('Server router loaded');

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
    logger.debug(`Entered /login route - headers=${JSON.stringify(req.headers)}`);
    const useFallback = mongoose.connection.readyState !== 1;
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(422).json({ error: "Fill all the details" });
    }
    try {
        logger.debug({ email, useFallback });
        let userValid;

        if (useFallback) {
            userValid = fallbackUsers.find((user) => user.email === email);
        } else {
            userValid = await userdb.findOne({ email });
        }

        if (!userValid) {
            logger.info('Login failed - user not found');
            return res.status(401).json({ error: "User does not exist" });
        }

        logger.info(`Found user for login: ${userValid._id}`);

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
        logger.error(error && error.stack ? error.stack : error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});



// user valid
router.get("/validuser", authenticate, async (req, res) => {
    try {
        // req.rootUser is populated by authenticate (supports DB and fallback)
        const ValidUserOne = req.rootUser;
        return res.status(200).json({ status: 200, ValidUserOne });
    } catch (error) {
        logger.error(error && error.stack ? error.stack : error);
        return res.status(401).json({ status: 401, error });
    }
});


// user logout

router.get("/logout", authenticate, async (req, res) => {
    try {
        // remove token from user's tokens array (works for Mongoose doc or fallback plain object)
        if (req.rootUser && Array.isArray(req.rootUser.tokens)) {
            req.rootUser.tokens = req.rootUser.tokens.filter((curelem) => curelem.token !== req.token);
        }

        res.clearCookie("usercookie", { path: "/" });

        // persist changes: if mongoose document, call save(); if fallback, update in-memory store
        if (req.rootUser && typeof req.rootUser.save === 'function') {
            await req.rootUser.save();
        } else {
            // update fallbackUsers array
            const index = fallbackUsers.findIndex(u => String(u._id) === String(req.userId));
            if (index !== -1) {
                fallbackUsers[index] = req.rootUser;
            }
        }

        return res.status(200).json({ status: 200 });

    } catch (error) {
        logger.error(error && error.stack ? error.stack : error);
        return res.status(401).json({ status: 401, error });
    }
});


module.exports = router;



// 2 way connection
// 12345 ---> e#@$hagsjd
// e#@$hagsjd -->  12345

// hashing compare
// 1 way connection
// 1234 ->> e#@$hagsjd
// 1234->> (e#@$hagsjd,e#@$hagsjd)=> true


