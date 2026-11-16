import PropTypes from "prop-types";
import "../styles/SettlementRows.css";

const groups = {
  deductions: {
    title: "Agreed deductions",
    action: "Add deduction",
    item: "deduction",
    blank: { label: "", roommateId: "everyone", amount: "" },
  },
  payments: {
    title: "Refund payments",
    action: "Record payment",
    item: "payment",
    blank: { date: "", roommateId: "", amount: "" },
  },
  notes: {
    title: "Follow-up notes",
    action: "Add note",
    item: "note",
    blank: { date: "", note: "" },
  },
};

export default function SettlementRows({ type, rows, roommates, onChange }) {
  const group = groups[type];

  function edit(row, field, value) {
    onChange(
      rows.map((entry) =>
        entry.key === row.key ? { ...entry, [field]: value } : entry,
      ),
    );
  }

  return (
    <fieldset className="settlement-rows">
      <legend>{group.title}</legend>
      {type === "deductions" && (
        <p className="hint">
          An equal split distributes any leftover cents in roommate order.
        </p>
      )}
      {rows.map((row, index) => (
        <div className="settlement-editor-row" key={row.key}>
          {type === "deductions" ? (
            <label>
              Description
              <input
                required
                maxLength={100}
                value={row.label}
                onChange={(event) => edit(row, "label", event.target.value)}
              />
            </label>
          ) : (
            <label>
              Date
              <input
                type="date"
                required
                value={row.date}
                onChange={(event) => edit(row, "date", event.target.value)}
              />
            </label>
          )}
          {type === "notes" ? (
            <label>
              Note
              <textarea
                required
                maxLength={500}
                rows={2}
                value={row.note}
                onChange={(event) => edit(row, "note", event.target.value)}
              />
            </label>
          ) : (
            <>
              <label>
                {type === "deductions" ? "Allocate to" : "Paid to"}
                <select
                  required
                  value={row.roommateId}
                  onChange={(event) =>
                    edit(row, "roommateId", event.target.value)
                  }
                >
                  {type === "deductions" ? (
                    <option value="everyone">Split equally</option>
                  ) : (
                    <option value="">Choose a roommate</option>
                  )}
                  {roommates.map(({ id, name }, index) => (
                    <option key={id} value={id}>
                      {name || "Roommate " + (index + 1)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Amount ($)
                <input
                  required
                  inputMode="decimal"
                  placeholder="0.00"
                  value={row.amount}
                  onChange={(event) => edit(row, "amount", event.target.value)}
                />
              </label>
            </>
          )}
          <button
            type="button"
            className="plain-button danger"
            aria-label={"Remove " + group.item + " " + (index + 1)}
            onClick={() =>
              onChange(rows.filter((entry) => entry.key !== row.key))
            }
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button button-secondary"
        disabled={rows.length >= 40}
        onClick={() =>
          onChange([...rows, { ...group.blank, key: crypto.randomUUID() }])
        }
      >
        + {group.action}
      </button>
    </fieldset>
  );
}

SettlementRows.propTypes = {
  type: PropTypes.oneOf(Object.keys(groups)).isRequired,
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      date: PropTypes.string,
      note: PropTypes.string,
      label: PropTypes.string,
      roommateId: PropTypes.string,
      amount: PropTypes.string,
    }),
  ).isRequired,
  roommates: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
  onChange: PropTypes.func.isRequired,
};
