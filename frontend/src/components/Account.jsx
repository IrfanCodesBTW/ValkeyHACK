import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Alert, Field } from "./demo/DemoUi";

const Account = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [login, setLogin] = useState({ email: "demo@valkey.local", password: "ValkeyDemo123" });
  const [register, setRegister] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState("");

  const submitLogin = async (event) => {
    event.preventDefault();
    setMessage("");
    setPending("login");
    try {
      await auth.login(login.email, login.password);
      navigate("/shop");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending("");
    }
  };

  const submitRegister = async (event) => {
    event.preventDefault();
    setMessage("");
    setPending("register");
    try {
      await auth.register(register);
      await auth.login(register.email, register.password);
      navigate("/shop");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending("");
    }
  };

  return (
    <section className="demo-section">
      <div className="demo-shell">
        {auth.user && (
          <div className="demo-account-banner">
            <div>
              <strong>
                {auth.user.firstName} {auth.user.lastName}
              </strong>
              <div className="demo-muted">{auth.user.email}</div>
            </div>
            <div className="d-flex gap-8 flex-wrap">
              <Link className="demo-button demo-button--secondary" to="/shop">
                Continue shopping
              </Link>
              <button type="button" className="demo-button" onClick={auth.logout}>
                Logout
              </button>
            </div>
          </div>
        )}
        {message && <Alert type="danger">{message}</Alert>}
        <div className="demo-auth-layout">
          <form className="demo-auth-card" onSubmit={submitLogin}>
            <h2>Login</h2>
            <Field id="login-email" label="Email address">
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={login.email}
                onChange={(event) => setLogin((value) => ({ ...value, email: event.target.value }))}
                required
              />
            </Field>
            <Field id="login-password" label="Password">
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={login.password}
                onChange={(event) => setLogin((value) => ({ ...value, password: event.target.value }))}
                required
              />
            </Field>
            <button className="demo-button" type="submit" disabled={pending === "login"}>
              <i className="ph ph-sign-in" aria-hidden="true" />
              {pending === "login" ? "Logging in" : "Log in"}
            </button>
          </form>

          <form className="demo-auth-card" onSubmit={submitRegister}>
            <h2>Register</h2>
            <div className="demo-form-grid">
              <Field id="register-first-name" label="First name">
                <input
                  id="register-first-name"
                  autoComplete="given-name"
                  value={register.firstName}
                  onChange={(event) => setRegister((value) => ({ ...value, firstName: event.target.value }))}
                  required
                />
              </Field>
              <Field id="register-last-name" label="Last name">
                <input
                  id="register-last-name"
                  autoComplete="family-name"
                  value={register.lastName}
                  onChange={(event) => setRegister((value) => ({ ...value, lastName: event.target.value }))}
                  required
                />
              </Field>
              <Field id="register-email" label="Email address">
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  value={register.email}
                  onChange={(event) => setRegister((value) => ({ ...value, email: event.target.value }))}
                  required
                />
              </Field>
              <Field id="register-password" label="Password">
                <input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  value={register.password}
                  minLength={8}
                  onChange={(event) => setRegister((value) => ({ ...value, password: event.target.value }))}
                  required
                />
              </Field>
            </div>
            <button className="demo-button mt-24" type="submit" disabled={pending === "register"}>
              <i className="ph ph-user-plus" aria-hidden="true" />
              {pending === "register" ? "Creating account" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Account;
