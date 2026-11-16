import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { request } from "../api.js";
import SettlementRows from "./SettlementRows.jsx";
import "../styles/SettlementEditor.css";

const newPerson = () => ({
  id: crypto.randomUUID(),
  name: "",
  contribution: "",
});
const blank = () => ({
  apartment: "",
  roommates: [newPerson()],
  deductions: [],
  payments: [],
  notes: [],
});
const keyEntries = (entries) =>
  entries.map((entry) => ({ ...entry, key: crypto.randomUUID() }));
const dollarInput = (cents) => (cents / 100).toFixed(2);

function draftFrom(record) {
  return {
    ...record,
    roommates: record.roommates.map(({ id, name, contributionCents }) => ({
      id,
      name,
      contribution: dollarInput(contributionCents),
    })),
    deductions: keyEntries(
      record.deductions.map(({ label, roommateId, amountCents }) => ({
        label,
        roommateId,
        amount: dollarInput(amountCents),
      })),
    ),
    payments: keyEntries(
      record.payments.map(({ date, roommateId, amountCents }) => ({
        date,
        roommateId,
        amount: dollarInput(amountCents),
      })),
    ),
    notes: keyEntries(record.notes),
  };
}

function toCents(value) {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value)) {
    throw new Error(
      "Enter each amount in dollars with up to two decimal places.",
    );
  }
  const [whole, decimals = ""] = value.split(".");
  return Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
}

export default function SettlementEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => (id ? null : blank()));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    request("/settlements/" + id, { signal: controller.signal })
      .then((record) => setDraft(draftFrom(record)))
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [id]);

  async function save(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const settlement = await request("/settlements" + (id ? "/" + id : ""), {
        method: id ? "PUT" : "POST",
        body: {
          apartment: draft.apartment,
          revision: draft.revision,
          roommates: draft.roommates.map(({ id, name, contribution }) => ({
            id,
            name,
            contributionCents: toCents(contribution),
          })),
          deductions: draft.deductions.map(({ label, roommateId, amount }) => ({
            label,
            roommateId,
            amountCents: toCents(amount),
          })),
          payments: draft.payments.map(({ date, roommateId, amount }) => ({
            date,
            roommateId,
            amountCents: toCents(amount),
          })),
          notes: draft.notes.map(({ date, note }) => ({ date, note })),
        },
      });
      navigate("/settlements/" + settlement.id);
    } catch (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  const setRows = (field, rows) =>
    setDraft((current) => ({ ...current, [field]: rows }));
  const back = id ? "/settlements/" + id : "/settlements";

  return (
    <article className="workspace settlement-editor">
      <Link className="back-link" to={back}>
        ← {id ? "Back to settlement" : "Deposit tracker"}
      </Link>
      <h1>{id ? "Edit settlement" : "New settlement"}</h1>
      {!draft && !error && <p role="status">Loading settlement…</p>}
      {draft && (
        <form onSubmit={save}>
          <label>
            Apartment name
            <input
              required
              maxLength={100}
              value={draft.apartment}
              onChange={(event) =>
                setDraft({ ...draft, apartment: event.target.value })
              }
            />
          </label>
          <fieldset>
            <legend>Roommate contributions</legend>
            {draft.roommates.map((person, index) => {
              const hasEntries = [...draft.deductions, ...draft.payments].some(
                (entry) => entry.roommateId === person.id,
              );
              const update = (key, value) =>
                setRows(
                  "roommates",
                  draft.roommates.map((row) =>
                    row.id === person.id ? { ...row, [key]: value } : row,
                  ),
                );
              return (
                <div className="settlement-editor-row" key={person.id}>
                  <label>
                    Roommate {index + 1} name
                    <input
                      required
                      maxLength={60}
                      value={person.name}
                      onChange={(event) => update("name", event.target.value)}
                    />
                  </label>
                  <label>
                    Contribution ($)
                    <input
                      required
                      inputMode="decimal"
                      placeholder="0.00"
                      value={person.contribution}
                      onChange={(event) =>
                        update("contribution", event.target.value)
                      }
                    />
                  </label>
                  <button
                    className="plain-button danger"
                    type="button"
                    disabled={hasEntries || draft.roommates.length === 1}
                    aria-label={"Remove roommate " + (index + 1)}
                    onClick={() =>
                      setRows(
                        "roommates",
                        draft.roommates.filter((row) => row.id !== person.id),
                      )
                    }
                  >
                    Remove
                  </button>
                  {hasEntries && (
                    <p className="hint">
                      Remove this roommate’s payments and individual deductions
                      first.
                    </p>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              className="button button-secondary"
              disabled={draft.roommates.length >= 20}
              onClick={() =>
                setRows("roommates", [...draft.roommates, newPerson()])
              }
            >
              + Add roommate
            </button>
          </fieldset>
          {["deductions", "payments", "notes"].map((type) => (
            <SettlementRows
              key={type}
              type={type}
              rows={draft[type]}
              roommates={draft.roommates}
              onChange={(rows) => setRows(type, rows)}
            />
          ))}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy ? "Saving…" : "Save settlement"}
          </button>
        </form>
      )}
      {!draft && error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </article>
  );
}

SettlementEditor.propTypes = {};
