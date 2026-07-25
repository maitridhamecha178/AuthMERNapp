const jwt = require("jsonwebtoken");
const userdb = require("../models/userSchema");
const mongoose = require("mongoose");
const fallbackUsers = require("../db/fallbackUsers");
const keysecret = process.env.SECRET_KEY || "secret123";
const logger = require("../utils/logger");

const authenticate = async (req, res, next) => {
    try {
        let token = req.headers.authorization || req.headers.Authorization || null;

        // support Bearer <token>
        if (token && token.startsWith("Bearer ")) {
            token = token.split(" ")[1];
        }

        // fallback to cookie if header missing
        if (!token && req.cookies && req.cookies.usercookie) {
            token = req.cookies.usercookie;
        }

        if (!token) {
            logger.info('Authenticate failed: no token provided');
            return res.status(401).json({ status: 401, message: 'Unauthorized: token missing' });
        }

        let verifytoken;
        try {
            verifytoken = jwt.verify(token, keysecret);
        } catch (err) {
            logger.info('Authenticate failed: token invalid');
            return res.status(401).json({ status: 401, message: 'Unauthorized: token invalid' });
        }

        let rootUser = await userdb.findOne({ _id: verifytoken._id });

        // if DB lookup failed, try in-memory fallback users
        if (!rootUser) {
            logger.debug('User not found in DB, checking fallback users');
            const fbUser = fallbackUsers.find((u) => String(u._id) === String(verifytoken._id));
            if (fbUser) {
                // ensure token is present in fallback user's tokens
                const hasToken = Array.isArray(fbUser.tokens) && fbUser.tokens.some(t => t.token === token);
                if (!hasToken) {
                    logger.info('Authenticate failed: token not present in fallback user');
                    return res.status(401).json({ status: 401, message: 'Unauthorized: token not associated with user' });
                }
                rootUser = fbUser;
            }
        }

        if (!rootUser) {
            logger.info('Authenticate failed: user not found for token');
            return res.status(401).json({ status: 401, message: 'Unauthorized: user not found' });
        }

        req.token = token;
        req.rootUser = rootUser;
        req.userId = rootUser._id;
        next();
    } catch (error) {
        logger.error(error && error.stack ? error.stack : error);
        return res.status(401).json({ status: 401, message: 'Unauthorized' });
    }
};

module.exports = authenticate;