import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { request } from "../api.js";
import { dateLabel, phaseLabel, userType } from "../models.js";
import "../styles/InspectionDetail.css";

export default function InspectionDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    request("/inspections/" + id, { signal: controller.signal })
      .then(setRecord)
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      });
    return () => controller.abort();
  }, [id]);

  async function remove() {
    setRemoving(true);
    setError("");
    try {
      await request("/inspections/" + id, { method: "DELETE" });
      navigate("/journal");
    } catch (failure) {
      setError(failure.message);
      setRemoving(false);
    }
  }

  return (
    <article className="workspace detail-page">
      <Link className="back-link" to="/journal">
        ← Inspection journal
      </Link>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!record && !error && <p role="status">Loading inspection…</p>}
      {record && (
        <>
          <div className="detail-title">
            <div>
              <div className="detail-meta">
                <span className={"phase " + record.phase}>
                  {phaseLabel[record.phase]}
                </span>
                <time dateTime={record.date}>{dateLabel(record.date)}</time>
              </div>
              <h1>{record.apartment}</h1>
            </div>
            {!user.demo && (
              <div className="detail-actions">
                <Link
                  className="button button-secondary"
                  to={"/journal/" + id + "/edit"}
                >
                  Edit inspection
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
              className="delete-panel"
              role="group"
              aria-label="Confirm deletion"
            >
              <p>Delete this inspection and all of its room observations?</p>
              <button
                type="button"
                className="button button-danger"
                onClick={remove}
                disabled={removing}
              >
                Delete inspection
              </button>
              <button
                type="button"
                className="plain-button"
                onClick={() => setConfirm(false)}
                disabled={removing}
              >
                Cancel
              </button>
            </div>
          )}
          <Link
            className="compare-detail-link"
            to={
              "/journal/compare?" +
              new URLSearchParams({ apartment: record.apartment })
            }
          >
            Compare inspections for this apartment →
          </Link>
          <h2>Room observations</h2>
          <ul className="room-list">
            {record.rooms.map((room) => (
              <li className="room-observation" key={room.name}>
                <h3>{room.name}</h3>
                <p className="condition">{room.condition}</p>
                {room.notes && <p>{room.notes}</p>}
                {room.links.map((link, index) => (
                  <a
                    key={link + index}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open photo {index + 1} <span aria-hidden="true">↗</span>
                  </a>
                ))}
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

InspectionDetail.propTypes = { user: userType.isRequired };
