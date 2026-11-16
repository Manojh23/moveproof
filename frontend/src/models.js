import PropTypes from "prop-types";

export const userType = PropTypes.shape({
  name: PropTypes.string.isRequired,
  demo: PropTypes.bool.isRequired,
});
export const roomType = PropTypes.shape({
  name: PropTypes.string.isRequired,
  condition: PropTypes.string.isRequired,
  notes: PropTypes.string.isRequired,
  links: PropTypes.arrayOf(PropTypes.string).isRequired,
});
export const inspectionType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  apartment: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
  phase: PropTypes.string.isRequired,
  rooms: PropTypes.arrayOf(roomType).isRequired,
  synthetic: PropTypes.bool,
});
export const phaseLabel = { "move-in": "Move-in", "move-out": "Move-out" };
export const dateLabel = (value) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value + "T00:00:00Z"));
