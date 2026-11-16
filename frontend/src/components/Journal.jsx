import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { request } from "../api.js";
import { userType } from "../models.js";
import InspectionCard from "./InspectionCard.jsx";
import "../styles/Journal.css";

export default function Journal({ user }) {
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    request("/inspections?" + query, { signal: controller.signal })
      .then(setResult)
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, reload]);

  function update(next) {
    setLoading(true);
    setError("");
    setParams(next);
    setReload((attempt) => attempt + 1);
  }

  function filter(event) {
    event.preventDefault();
    update(
      new URLSearchParams(
        [...new FormData(event.currentTarget)].filter(([, value]) => value),
      ),
    );
  }

  function page(number) {
    const next = new URLSearchParams(params);
    next.set("page", String(number));
    update(next);
  }

  const pages = result ? Math.ceil(result.total / result.pageSize) : 0;

  return (
    <article className="workspace">
      {user.demo && (
        <p className="demo-notice">
          Demo mode · These inspections use synthetic records and are read-only.
        </p>
      )}
      <section className="journal-hero">
        <div>
          <h1>Inspection journal</h1>
          <p>
            Keep dated room observations and see what changed between move-in
            and move-out.
          </p>
          <div className="journal-actions">
            {!user.demo && (
              <Link className="button" to="/journal/new">
                + New inspection
              </Link>
            )}
            <Link
              className={user.demo ? "button" : "button button-secondary"}
              to="/journal/compare"
            >
              Compare inspections <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <img src="/living-room.webp" alt="" width="470" height="180" />
      </section>
      <section className="journal-records" aria-labelledby="record-heading">
        <div className="section-heading">
          <h2 id="record-heading">Inspection records</h2>
          {!loading && !error && result && (
            <span>
              {result.total.toLocaleString()}{" "}
              {result.total === 1 ? "record" : "records"}
            </span>
          )}
        </div>
        <form className="filter-form" onSubmit={filter} key={query}>
          <label>
            Apartment
            <input
              name="apartment"
              placeholder="Search by apartment name"
              maxLength={100}
              defaultValue={params.get("apartment") || ""}
            />
          </label>
          <label>
            Inspection type
            <select name="phase" defaultValue={params.get("phase") || ""}>
              <option value="">All types</option>
              <option value="move-in">Move-in</option>
              <option value="move-out">Move-out</option>
            </select>
          </label>
          <label>
            Inspection date
            <input
              name="date"
              type="date"
              defaultValue={params.get("date") || ""}
            />
          </label>
          <button className="button button-secondary">Apply filters</button>
          {query && (
            <button
              className="plain-button"
              type="button"
              onClick={() => update(new URLSearchParams())}
            >
              Clear
            </button>
          )}
        </form>
        {loading ? (
          <p role="status">Loading inspections…</p>
        ) : error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : (
          result && (
            <>
              {result.records.length ? (
                <ul className="inspection-grid">
                  {result.records.map((record) => (
                    <InspectionCard key={record.id} record={record} />
                  ))}
                </ul>
              ) : (
                <p className="empty-state">
                  {query
                    ? "No inspections match these filters."
                    : "Add an inspection to start documenting your apartment."}
                </p>
              )}
              {pages > 1 && (
                <nav className="pagination" aria-label="Inspection pages">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => page(result.page - 1)}
                    disabled={result.page <= 1}
                  >
                    Previous
                  </button>
                  <span>
                    Page {result.page} of {pages}
                  </span>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => page(result.page + 1)}
                    disabled={result.page >= pages}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )
        )}
      </section>
    </article>
  );
}

Journal.propTypes = { user: userType.isRequired };
