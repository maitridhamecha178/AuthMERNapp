import React, { useState } from 'react';
import { NavLink, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import "./mix.css";

const Login = () => {
    const [passShow, setPassShow] = useState(false);

    const [inpval, setInpval] = useState({
        email: "",
        password: "",
    });

    const history = useNavigate();

    const setVal = (e) => {
        const { name, value } = e.target;
        setInpval({
            ...inpval,
            [name]: value
        });
    };

    const loginuser = async (e) => {
        e.preventDefault();

        const { email, password } = inpval; // Extract values from inpval

        // Basic client-side validations
        if (email === "") {
            toast.error("Email is required!", { position: "top-center" });
            return;
        } else if (!email.includes("@")) {
            toast.warning("Please include @ in your email!", { position: "top-center" });
            return;
        } else if (password === "") {
            toast.error("Password is required!", { position: "top-center" });
            return;
        } else if (password.length < 6) {
            toast.error("Password must be at least 6 characters!", { position: "top-center" });
            return;
        }

        try {
            const res = await fetch("/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data.token) {
                localStorage.setItem("usersdatatoken", data.token);
                history("/dash");
                setInpval({ email: "", password: "" });
            } else {
                console.error("Login failed:", data.error || "No token returned");
                toast.error(data.error || "Login failed!");
            }
        } catch (error) {
            console.error("Login fetch error:", error);
            toast.error("An error occurred. Please try again.");
        }
    };

    return (
        <>
            <section>
                <div className="form_data">
                    <div className="form_heading">
                        <h1>Welcome Back, Log In</h1>
                        <p>Hi, we are you glad you are back. Please login.</p>
                    </div>
                    <form>
                        <div className="form_input">
                            <label htmlFor="email">Email</label>
                            <input type="email" value={inpval.email} onChange={setVal} name="email" id="email" placeholder='Enter Your Email Address' />
                        </div>
                        <div className="form_input">
                            <label htmlFor="password">Password</label>
                            <div className="two">
                                <input type={!passShow ? "password" : "text"} onChange={setVal} value={inpval.password} name="password" id="password" placeholder='Enter Your password' />
                                <div className="showpass" onClick={() => setPassShow(!passShow)}>
                                    {!passShow ? "Show" : "Hide"}
                                </div>
                            </div>
                        </div>

                        <button className='btn' onClick={loginuser}>Login</button>
                        <p>Don't have an Account? <NavLink to="/register">Sign Up</NavLink> </p>
                    </form>
                    <ToastContainer />
                </div>
            </section>
        </>
    );
};

export default Login;