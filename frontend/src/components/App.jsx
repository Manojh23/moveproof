import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { request } from "../api.js";
import Landing from "./Landing.jsx";
import Journal from "./Journal.jsx";
import InspectionDetail from "./InspectionDetail.jsx";
import InspectionForm from "./InspectionForm.jsx";
import Comparison from "./Comparison.jsx";
import "../styles/App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const controller = new AbortController();
    request("/auth/session", { signal: controller.signal })
      .then((session) => setUser(session.user))
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  function signedIn(account) {
    setUser(account);
    setError("");
    navigate("/journal");
  }

  async function signOut() {
    try {
      await request("/auth/logout", { method: "POST" });
      setUser(null);
      setError("");
      navigate("/");
    } catch (failure) {
      setError(failure.message);
    }
  }

  const start = loading ? (
    <p className="app-loading" role="status">
      Loading MoveProof…
    </p>
  ) : user ? (
    <Navigate to="/journal" replace />
  ) : (
    <Landing onSignIn={signedIn} />
  );

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-nav">
          <Link className="brand" to={user ? "/journal" : "/"}>
            <span className="brand-mark" aria-hidden="true">
              <span></span>
              <span></span>
            </span>
            MoveProof<span className="brand-dot">.</span>
          </Link>
          {user && (
            <nav aria-label="Main navigation">
              <Link to="/journal">Inspection journal</Link>
              <button type="button" className="plain-button" onClick={signOut}>
                {user.demo ? "Exit demo" : "Sign out"}
              </button>
            </nav>
          )}
        </div>
      </header>
      <main id="main">
        {error && (
          <p className="site-error error" role="alert">
            {error}
          </p>
        )}
        <Routes>
          <Route path="/" element={start} />
          {user ? (
            <>
              <Route path="/journal" element={<Journal user={user} />} />
              <Route
                path="/journal/new"
                element={
                  user.demo ? (
                    <Navigate to="/journal" replace />
                  ) : (
                    <InspectionForm key={pathname} />
                  )
                }
              />
              <Route path="/journal/compare" element={<Comparison />} />
              <Route
                path="/journal/:id"
                element={<InspectionDetail key={pathname} user={user} />}
              />
              <Route
                path="/journal/:id/edit"
                element={
                  user.demo ? (
                    <Navigate to="/journal" replace />
                  ) : (
                    <InspectionForm key={pathname} />
                  )
                }
              />
            </>
          ) : (
            <Route
              path="/journal/*"
              element={loading ? start : <Navigate to="/" replace />}
            />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <span>MoveProof</span>
        <span>Apartment inspection journal</span>
      </footer>
    </>
  );
}

App.propTypes = {};
