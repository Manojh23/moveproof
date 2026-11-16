import { dateLabel, inspectionType } from "../models.js";
import "../styles/ComparisonTable.css";

export default function ComparisonTable({ first, second }) {
  const firstRooms = new Map(
    first.rooms.map((room) => [room.name.toLowerCase(), room]),
  );
  const secondRooms = new Map(
    second.rooms.map((room) => [room.name.toLowerCase(), room]),
  );
  const names = new Set([...firstRooms.keys(), ...secondRooms.keys()]);

  return (
    <div className="comparison-table-scroll">
      <table className="comparison-table">
        <thead>
          <tr>
            <th scope="col">Room</th>
            <th scope="col">
              Move-in <time dateTime={first.date}>{dateLabel(first.date)}</time>
            </th>
            <th scope="col">
              Move-out{" "}
              <time dateTime={second.date}>{dateLabel(second.date)}</time>
            </th>
            <th scope="col">Result</th>
          </tr>
        </thead>
        <tbody>
          {[...names].map((name) => {
            const before = firstRooms.get(name);
            const after = secondRooms.get(name);
            const status =
              !before || !after
                ? "Missing observation"
                : before.condition !== after.condition
                  ? "Condition changed"
                  : "Same condition";
            return (
              <tr key={name}>
                <th scope="row">{before?.name || after.name}</th>
                {[before, after].map((room, index) => (
                  <td key={index}>
                    {room ? (
                      <>
                        <strong>{room.condition}</strong>
                        {room.notes && <p>{room.notes}</p>}
                        {room.links.map((link, photo) => (
                          <a
                            key={link + photo}
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Photo {photo + 1} ↗
                          </a>
                        ))}
                      </>
                    ) : (
                      "No observation"
                    )}
                  </td>
                ))}
                <td>
                  <span
                    className={
                      "comparison-status" +
                      (status === "Same condition" ? " stable" : "")
                    }
                  >
                    {status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

ComparisonTable.propTypes = {
  first: inspectionType.isRequired,
  second: inspectionType.isRequired,
};
