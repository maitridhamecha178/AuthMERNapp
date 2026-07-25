const express = require("express");
const router = new express.Router();
const userdb = require("../models/userSchema");
var bcrypt = require("bcryptjs");
const authenticate = require("../middleware/authenticate");


// for user registration

router.post("/register", async (req, res) => {

    const { fname, email, password, cpassword } = req.body;

    if (!fname || !email || !password || !cpassword) {
        res.status(422).json({ error: "fill all the details" })
    }

    try {

        const preuser = await userdb.findOne({ email: email });

        if (preuser) {
            res.status(422).json({ error: "This Email is Already Exist" })
        } else if (password !== cpassword) {
            res.status(422).json({ error: "Password and Confirm Password Not Match" })
        } else {
            const finalUser = new userdb({
                fname, email, password, cpassword
            });

            // here password hasing

            const storeData = await finalUser.save();

            // console.log(storeData);
            res.status(201).json({ status: 201, storeData })
        }

    } catch (error) {
        res.status(422).json(error);
        console.log("catch block error");
    }

});




// user Login

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(422).json({ error: "Fill all the details" });
    }
    try {
        const userValid = await userdb.findOne({ email });
        if (!userValid) {
            return res.status(401).json({ error: "User does not exist" });
        }
        const isMatch = await bcrypt.compare(password, userValid.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        } else {
            // Generate token using the method in userSchema.js
            const token = await userValid.generateAuthtoken();
            // Set the token as an httpOnly cookie (optional)
            res.cookie("usercookie", token, {
                expires: new Date(Date.now() + 86400000), // 1 day
                httpOnly: true
            });
            // Return a proper JSON response including the token and user data
            return res.status(200).json({ token, userValid });
        }
    } catch (error) {
        console.error("Login error:", error);
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


