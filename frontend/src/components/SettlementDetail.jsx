import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { request } from "../api.js";
import { dateLabel, userType } from "../models.js";
import { money, statuses } from "../settlementModels.js";
import "../styles/SettlementDetail.css";

export default function SettlementDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    request("/settlements/" + id, { signal: controller.signal })
      .then(setRecord)
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [id]);

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await request("/settlements/" + id, { method: "DELETE" });
      navigate("/settlements");
    } catch (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  const names = new Map(record?.roommates.map(({ id, name }) => [id, name]));
  const totals = record?.summary.totals;

  return (
    <article className="workspace settlement-detail">
      <Link className="back-link" to="/settlements">
        ← Deposit tracker
      </Link>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!record && !error && <p role="status">Loading settlement…</p>}
      {record && (
        <>
          <div className="settlement-detail-header">
            <div>
              <span className={"settlement-status " + record.summary.status}>
                {statuses[record.summary.status]}
              </span>
              <h1>{record.apartment}</h1>
            </div>
            {!user.demo && (
              <div className="settlement-actions">
                <Link
                  className="button button-secondary"
                  to={"/settlements/" + id + "/edit"}
                >
                  Edit settlement
                </Link>
                <button
                  className="plain-button danger"
                  type="button"
                  onClick={() => setConfirm(true)}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          {confirm && (
            <div
              className="settlement-panel"
              role="group"
              aria-label="Confirm deletion"
            >
              <p>Delete this settlement and its refund history?</p>
              <div className="settlement-actions">
                <button
                  type="button"
                  className="button button-danger"
                  onClick={remove}
                  disabled={busy}
                >
                  Delete settlement
                </button>
                <button
                  type="button"
                  className="plain-button"
                  onClick={() => setConfirm(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <dl className="settlement-totals">
            {[
              ["Deposit", totals.contributionCents],
              ["Agreed deductions", totals.deductedCents],
              ["Refunds received", totals.receivedCents],
              ["Remaining refund", totals.balanceCents],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{money(value)}</dd>
              </div>
            ))}
          </dl>
          <section
            className="settlement-panel"
            aria-labelledby="roommate-breakdown"
          >
            <h2 id="roommate-breakdown">Roommate breakdown</h2>
            <div className="settlement-table">
              <table>
                <thead>
                  <tr>
                    {[
                      "Roommate",
                      "Deposit",
                      "Deductions",
                      "Expected",
                      "Received",
                      "Remaining",
                    ].map((heading) => (
                      <th key={heading} scope="col">
                        {heading}
                      </th>
                    ))}
                    {totals.excessCents > 0 && <th scope="col">Overpayment</th>}
                  </tr>
                </thead>
                <tbody>
                  {record.summary.people.map((person) => (
                    <tr key={person.id}>
                      <th scope="row">{person.name}</th>
                      {[
                        person.contributionCents,
                        person.deductedCents,
                        person.expectedCents,
                        person.receivedCents,
                        person.balanceCents,
                      ].map((value, index) => (
                        <td key={index}>{money(value)}</td>
                      ))}
                      {totals.excessCents > 0 && (
                        <td>{money(person.excessCents)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <div className="settlement-detail-grid">
            <section className="settlement-panel">
              <h2>Agreed deductions</h2>
              {record.deductions.length ? (
                <ul className="settlement-entries">
                  {record.deductions.map((deduction, index) => (
                    <li key={index}>
                      <div>
                        <strong>{deduction.label}</strong>
                        <p>
                          {names.get(deduction.roommateId) || "Split equally"}
                        </p>
                      </div>
                      <span>{money(deduction.amountCents)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No deductions recorded.</p>
              )}
            </section>
            <section className="settlement-panel">
              <h2>Refund and follow-up history</h2>
              {!record.payments.length && !record.notes.length ? (
                <p>No payments or notes yet.</p>
              ) : (
                <ul className="settlement-entries">
                  {[...record.payments, ...record.notes]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((entry, index) => (
                      <li key={index}>
                        <div>
                          <time dateTime={entry.date}>
                            {dateLabel(entry.date)}
                          </time>
                          <p>{entry.note || names.get(entry.roommateId)}</p>
                        </div>
                        {/* the && with a number can print a 0 here, you could try entry.amountCents != null && (...) */}
                        {entry.amountCents && (
                          <span>{money(entry.amountCents)}</span>
                        )}
                      </li>
                    ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </article>
  );
}

SettlementDetail.propTypes = { user: userType.isRequired };
