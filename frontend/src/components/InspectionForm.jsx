import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { request } from "../api.js";
import "../styles/InspectionForm.css";

const emptyRoom = { name: "", condition: "Good", notes: "", links: "" };
const newRoom = () => ({ ...emptyRoom, key: crypto.randomUUID() });

export default function InspectionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [rooms, setRooms] = useState(() => [newRoom()]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    request("/inspections/" + id, { signal: controller.signal })
      .then((value) => {
        setRecord(value);
        setRooms(
          value.rooms.map((room) => ({
            ...room,
            key: crypto.randomUUID(),
            links: room.links.join("\n"),
          })),
        );
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      });
    return () => controller.abort();
  }, [id]);

  function editRoom(key, field, value) {
    setRooms((current) =>
      current.map((room) =>
        room.key === key ? { ...room, [field]: value } : room,
      ),
    );
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const observations = rooms.map(({ name, condition, notes, links }) => ({
      name,
      condition,
      notes,
      links: links
        .split("\n")
        .map((link) => link.trim())
        .filter(Boolean),
    }));

    try {
      const saved = await request("/inspections" + (id ? "/" + id : ""), {
        method: id ? "PUT" : "POST",
        body: { ...values, rooms: observations },
      });
      navigate("/journal/" + saved.id);
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  }

  return (
    <article className="workspace inspection-form-page">
      <Link className="back-link" to={id ? "/journal/" + id : "/journal"}>
        ← {id ? "Back to inspection" : "Inspection journal"}
      </Link>
      <h1>{id ? "Edit inspection" : "New inspection"}</h1>
      {id &&
        !record &&
        (error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : (
          <p role="status">Loading inspection…</p>
        ))}
      {(!id || record) && (
        <form className="inspection-form" onSubmit={save}>
          <div className="form-top">
            <label>
              Apartment name
              <input
                name="apartment"
                maxLength={100}
                defaultValue={record?.apartment}
                placeholder="e.g. Beacon Street Apartment"
                required
              />
            </label>
            <label>
              Date
              <input
                type="date"
                name="date"
                defaultValue={record?.date}
                required
              />
            </label>
            <label>
              Type
              <select name="phase" defaultValue={record?.phase || "move-in"}>
                <option value="move-in">Move-in</option>
                <option value="move-out">Move-out</option>
              </select>
            </label>
          </div>
          <h2>Room observations</h2>
          <p className="hint">
            Use the same room names at move-in and move-out so the comparison
            can match them.
          </p>
          {rooms.map((room, index) => (
            <fieldset className="room-editor" key={room.key}>
              <legend>Room {index + 1}</legend>
              <div className="room-fields">
                <label>
                  Room name
                  <input
                    value={room.name}
                    onChange={(event) =>
                      editRoom(room.key, "name", event.target.value)
                    }
                    maxLength={80}
                    placeholder="e.g. Living room"
                    required
                  />
                </label>
                <label>
                  Condition
                  <select
                    value={room.condition}
                    onChange={(event) =>
                      editRoom(room.key, "condition", event.target.value)
                    }
                  >
                    {["Excellent", "Good", "Fair", "Needs repair"].map(
                      (condition) => (
                        <option key={condition}>{condition}</option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              <label>
                Notes <span className="hint">(optional)</span>
                <textarea
                  value={room.notes}
                  onChange={(event) =>
                    editRoom(room.key, "notes", event.target.value)
                  }
                  rows={3}
                  maxLength={1000}
                />
              </label>
              <label>
                Photo links{" "}
                <span className="hint">
                  (optional, up to three links, one per line)
                </span>
                <textarea
                  value={room.links}
                  onChange={(event) =>
                    editRoom(room.key, "links", event.target.value)
                  }
                  placeholder="https://…"
                  rows={2}
                  maxLength={3002}
                />
              </label>
              {rooms.length > 1 && (
                <button
                  type="button"
                  className="plain-button danger"
                  onClick={() =>
                    setRooms((current) =>
                      current.filter(({ key }) => key !== room.key),
                    )
                  }
                >
                  Remove room {index + 1}
                </button>
              )}
            </fieldset>
          ))}
          <button
            className="button button-secondary"
            type="button"
            disabled={rooms.length >= 20}
            onClick={() => setRooms((current) => [...current, newRoom()])}
          >
            + Add room
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="form-save">
            <button className="button" disabled={busy}>
              {busy ? "Saving…" : "Save inspection"}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

InspectionForm.propTypes = {};
