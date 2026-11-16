import { useState } from "react";
import PropTypes from "prop-types";
import { request } from "../api.js";
import "../styles/Landing.css";

export default function Landing({ onSignIn }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(path, body) {
    setBusy(true);
    setError("");
    try {
      const { user } = await request("/auth/" + path, { method: "POST", body });
      onSignIn(user);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  function handleForm(event) {
    event.preventDefault();
    submit(
      register ? "register" : "login",
      Object.fromEntries(new FormData(event.currentTarget)),
    );
  }

  return (
    <div className="landing">
      <section className="landing-intro">
        <div className="landing-copy">
          <p className="eyebrow">Your apartment record</p>
          <h1>
            Know what changed
            <br />
            when you moved.
          </h1>
          <p>
            Record the condition of each room, then compare move-in and move-out
            side by side.
          </p>
        </div>
        <img
          className="landing-photo"
          src="/living-room.webp"
          alt="Sunny apartment living room with a beige sofa"
          width="1400"
          height="934"
        />
      </section>
      <section className="signin-card" aria-labelledby="signin-title">
        <h2 id="signin-title">
          {register ? "Create an account" : "Sign in to your journal"}
        </h2>
        <form onSubmit={handleForm} key={String(register)}>
          {register && (
            <label>
              Name
              <input name="name" autoComplete="name" maxLength={70} required />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              minLength={10}
              maxLength={72}
              required
            />
          </label>
          {register && <p className="hint">Use at least 10 characters.</p>}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
          </button>
        </form>
        <button
          className="plain-button"
          type="button"
          disabled={busy}
          onClick={() => {
            setRegister(!register);
            setError("");
          }}
        >
          {register
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>
        <div className="demo-action">
          <button
            className="button button-secondary"
            type="button"
            disabled={busy}
            onClick={() => submit("demo")}
          >
            Explore the demo <span aria-hidden="true">↗</span>
          </button>
          <p className="hint">
            Browse sample inspections and try the comparison.
          </p>
        </div>
      </section>
    </div>
  );
}

Landing.propTypes = { onSignIn: PropTypes.func.isRequired };
