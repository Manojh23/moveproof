import { Link } from "react-router-dom";
import { dateLabel, inspectionType, phaseLabel } from "../models.js";
import "../styles/InspectionCard.css";

export default function InspectionCard({ record }) {
  return (
    <li className="inspection-card">
      <div className="inspection-card-meta">
        <span className={"phase " + record.phase}>
          {phaseLabel[record.phase]}
        </span>
        <time dateTime={record.date}>{dateLabel(record.date)}</time>
      </div>
      <h3>
        <Link to={"/journal/" + record.id}>{record.apartment}</Link>
      </h3>
      <p>
        {record.rooms.length} {record.rooms.length === 1 ? "room" : "rooms"}{" "}
        documented
      </p>
      <Link
        className="inspection-card-link"
        aria-label={
          "View " +
          record.apartment +
          " " +
          phaseLabel[record.phase] +
          " inspection on " +
          dateLabel(record.date)
        }
        to={"/journal/" + record.id}
      >
        View inspection <span aria-hidden="true">→</span>
      </Link>
    </li>
  );
}

InspectionCard.propTypes = { record: inspectionType.isRequired };
