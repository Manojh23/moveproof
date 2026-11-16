import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { request } from "../api.js";
import { dateLabel } from "../models.js";
import ComparisonTable from "./ComparisonTable.jsx";
import "../styles/Comparison.css";

export default function Comparison() {
  const [params, setParams] = useSearchParams();
  const apartment = params.get("apartment") || "";
  const [loaded, setLoaded] = useState(null);
  const [selection, setSelection] = useState({ first: "", second: "" });
  const [pair, setPair] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!apartment) return;
    const controller = new AbortController();
    request("/inspections/choices?" + new URLSearchParams({ apartment }), {
      signal: controller.signal,
    })
      .then(({ records }) => setLoaded({ apartment, records }))
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setLoaded({ apartment, records: [] });
          setError(failure.message);
        }
      });
    return () => controller.abort();
  }, [apartment]);

  function find(event) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("apartment").trim();
    if (!value || value === apartment || busy) return;
    setError("");
    setPair(null);
    setSelection({ first: "", second: "" });
    setParams({ apartment: value });
  }

  async function compare(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setPair(null);
    try {
      const records = await Promise.all([
        request("/inspections/" + selection.first),
        request("/inspections/" + selection.second),
      ]);
      if (
        records[0].apartment.toLowerCase() !==
          records[1].apartment.toLowerCase() ||
        records[0].phase !== "move-in" ||
        records[1].phase !== "move-out"
      ) {
        throw new Error(
          "These inspections changed. Choose a move-in and move-out inspection for the same apartment.",
        );
      }
      setPair(records);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  const records = loaded?.apartment === apartment ? loaded.records : null;
  const moveIns = records?.filter((record) => record.phase === "move-in");
  const moveOuts = records?.filter((record) => record.phase === "move-out");
  const showingPair =
    pair && pair[0].apartment.toLowerCase() === apartment.toLowerCase();

  return (
    <article className="workspace comparison-page">
      <Link className="back-link" to="/journal">
        ← Inspection journal
      </Link>
      <h1>Compare inspections</h1>
      <p className="comparison-intro">
        Choose a move-in and a move-out inspection for the same apartment.
        Matching room names appear side by side.
      </p>
      <form
        className="comparison-controls apartment-find"
        onSubmit={find}
        key={apartment}
      >
        <label>
          Exact apartment name
          <input
            name="apartment"
            maxLength={100}
            placeholder="e.g. Beacon Street Apartment"
            defaultValue={apartment}
            required
          />
        </label>
        <button className="button button-secondary" disabled={busy}>
          Find inspections
        </button>
      </form>
      {apartment && records === null && (
        <p role="status">Finding inspections…</p>
      )}
      {records && !error && (!moveIns.length || !moveOuts.length) && (
        <p className="empty-state">
          A comparison needs a move-in and a move-out inspection with this
          apartment name.
        </p>
      )}
      {moveIns?.length > 0 && moveOuts?.length > 0 && (
        <form className="comparison-controls" onSubmit={compare}>
          {[
            ["first", "Move-in inspection", moveIns],
            ["second", "Move-out inspection", moveOuts],
          ].map(([key, label, choices]) => (
            <label key={key}>
              {label}
              <select
                value={selection[key]}
                onChange={(event) =>
                  setSelection({ ...selection, [key]: event.target.value })
                }
                required
                disabled={busy}
              >
                <option value="">Choose an inspection</option>
                {choices.map((record) => (
                  <option key={record.id} value={record.id}>
                    {dateLabel(record.date)} · {record.id.slice(-5)}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button className="button" disabled={busy}>
            {busy ? "Comparing…" : "Compare rooms"}
          </button>
        </form>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {showingPair && (
        <section
          className="comparison-result"
          aria-labelledby="comparison-heading"
        >
          <div className="section-heading">
            <h2 id="comparison-heading">{pair[0].apartment}</h2>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => window.print()}
            >
              Print comparison
            </button>
          </div>
          <ComparisonTable first={pair[0]} second={pair[1]} />
        </section>
      )}
    </article>
  );
}

Comparison.propTypes = {};
