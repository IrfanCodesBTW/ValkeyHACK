import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Account = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [login, setLogin] = useState({ email: "demo@valkey.local", password: "ValkeyDemo123" });
  const [register, setRegister] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [message, setMessage] = useState("");

  const submitLogin = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      await auth.login(login.email, login.password);
      navigate("/shop");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const submitRegister = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      await auth.register(register);
      await auth.login(register.email, register.password);
      navigate("/shop");
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="account py-80">
      <div className="container container-lg">
        {auth.user && (
          <div className="border border-gray-100 rounded-8 p-24 mb-24 flex-between gap-16 flex-wrap">
            <div>
              <h6 className="mb-4">Signed in as {auth.user.firstName} {auth.user.lastName}</h6>
              <span className="text-gray-500">{auth.user.email}</span>
            </div>
            <button type="button" className="btn btn-outline-main" onClick={auth.logout}>Logout</button>
          </div>
        )}
        {message && <div className="alert alert-danger">{message}</div>}
        <div className="row gy-4">
          <div className="col-xl-6 pe-xl-5">
            <form onSubmit={submitLogin} className="border border-gray-100 hover-border-main-600 transition-1 rounded-8 px-24 py-40 h-100">
              <h6 className="text-xl mb-32">Login</h6>
              <div className="mb-24">
                <label className="text-neutral-900 text-lg mb-8 fw-medium" htmlFor="login-email">Email address</label>
                <input id="login-email" type="email" className="common-input" value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} />
              </div>
              <div className="mb-24">
                <label className="text-neutral-900 text-lg mb-8 fw-medium" htmlFor="login-password">Password</label>
                <input id="login-password" type="password" className="common-input" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-main py-18 px-40">Log in</button>
            </form>
          </div>
          <div className="col-xl-6">
            <form onSubmit={submitRegister} className="border border-gray-100 hover-border-main-600 transition-1 rounded-8 px-24 py-40">
              <h6 className="text-xl mb-32">Register</h6>
              <div className="row gy-3">
                <div className="col-sm-6">
                  <input className="common-input" placeholder="First name" value={register.firstName} onChange={(e) => setRegister({ ...register, firstName: e.target.value })} />
                </div>
                <div className="col-sm-6">
                  <input className="common-input" placeholder="Last name" value={register.lastName} onChange={(e) => setRegister({ ...register, lastName: e.target.value })} />
                </div>
                <div className="col-12">
                  <input type="email" className="common-input" placeholder="Email address" value={register.email} onChange={(e) => setRegister({ ...register, email: e.target.value })} />
                </div>
                <div className="col-12">
                  <input type="password" className="common-input" placeholder="Password, 8+ characters" value={register.password} onChange={(e) => setRegister({ ...register, password: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-main py-18 px-40 mt-32">Register</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Account;
