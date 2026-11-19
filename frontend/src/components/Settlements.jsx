import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { request } from "../api.js";
import { userType } from "../models.js";
import { money, statuses } from "../settlementModels.js";
import "../styles/Settlements.css";

export default function Settlements({ user }) {
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const status = params.get("status") || "";
  const [loaded, setLoaded] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    request("/settlements?" + query, { signal: controller.signal })
      // I like the pattern you used here so that you won't have to keep resetting the loading and error states. Nice!
      .then((data) => setLoaded({ query, data }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setLoaded({ query, error: error.message });
      });
    return () => controller.abort();
  }, [query]);

  const current = loaded?.query === query ? loaded : null;
  const data = current?.data;

  function selectStatus(value) {
    setParams(value ? { status: value } : {});
  }

  function changePage(page) {
    const next = new URLSearchParams(params);
    next.set("page", page);
    setParams(next);
  }

  return (
    <article className="workspace settlements-page">
      {user.demo && (
        <p className="settlements-demo">
          Demo mode · Synthetic settlements are read-only.
        </p>
      )}
      <div className="settlements-heading">
        <div>
          <h1>Deposit tracker</h1>
          <p>
            Track contributions, agreed deductions, and refunds for each
            roommate.
          </p>
        </div>
        {!user.demo && (
          <Link className="button" to="/settlements/new">
            + New settlement
          </Link>
        )}
      </div>
      <div className="settlements-toolbar">
        <label>
          Refund status
          <select
            value={status}
            onChange={(event) => selectStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            {Object.entries(statuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {data && (
          <span>
            {data.total.toLocaleString()}{" "}
            {data.total === 1 ? "settlement" : "settlements"}
          </span>
        )}
      </div>
      {!current && <p role="status">Loading settlements…</p>}
      {current?.error && (
        <p role="alert" className="error">
          {current.error}
        </p>
      )}
      {data &&
        (data.records.length ? (
          <ul className="settlements-list">
            {data.records.map((record) => (
              <li key={record.id}>
                <span className={"settlement-status " + record.summary.status}>
                  {statuses[record.summary.status]}
                </span>
                <h2>
                  <Link to={"/settlements/" + record.id}>
                    {record.apartment}
                  </Link>
                </h2>
                <p>
                  {record.roommates.length}{" "}
                  {record.roommates.length === 1 ? "roommate" : "roommates"}
                </p>
                <p>
                  <strong>{money(record.summary.totals.balanceCents)}</strong>{" "}
                  remaining
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            {status
              ? "No settlements match this status."
              : "Add a settlement to start tracking refunds."}
          </p>
        ))}
      {data && data.total > data.pageSize && (
        <nav className="settlements-pagination" aria-label="Settlement pages">
          <button
            type="button"
            className="button button-secondary"
            disabled={data.page <= 1}
            onClick={() => changePage(data.page - 1)}
          >
            Previous
          </button>
          <span>
            Page {data.page} of {Math.ceil(data.total / data.pageSize)}
          </span>
          <button
            type="button"
            className="button button-secondary"
            disabled={data.page * data.pageSize >= data.total}
            onClick={() => changePage(data.page + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </article>
  );
}

Settlements.propTypes = { user: userType.isRequired };
