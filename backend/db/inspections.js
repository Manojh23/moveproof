import { ObjectId } from "mongodb";

export const conditions = ["Excellent", "Good", "Fair", "Needs repair"];
export const phases = ["move-in", "move-out"];

const clean = (value, limit) =>
  typeof value === "string" ? value.trim().slice(0, limit) : "";

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(value);
  return (
    Number.isFinite(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function validPhoto(value) {
  if (typeof value !== "string" || value.length > 1000) return false;
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function validateInspection(body) {
  const apartment = clean(body?.apartment, 100);
  if (!apartment || !validDate(body.date) || !phases.includes(body.phase)) {
    return {
      error: "Enter an apartment, a valid date, and an inspection type.",
    };
  }
  if (
    !Array.isArray(body.rooms) ||
    body.rooms.length < 1 ||
    body.rooms.length > 20
  ) {
    return { error: "Add between one and 20 room observations." };
  }
  const roomNames = new Set();
  const rooms = [];
  for (const room of body.rooms) {
    const name = clean(room?.name, 80);
    if (
      !name ||
      !conditions.includes(room.condition) ||
      roomNames.has(name.toLowerCase())
    ) {
      return { error: "Give each room a unique name and a condition." };
    }
    if (
      !Array.isArray(room.links) ||
      room.links.length > 3 ||
      !room.links.every(validPhoto)
    ) {
      return {
        error: "Enter up to three complete HTTPS or HTTP photo links per room.",
      };
    }
    roomNames.add(name.toLowerCase());
    rooms.push({
      name,
      condition: room.condition,
      notes: clean(room.notes, 1000),
      links: room.links,
    });
  }
  return { record: { apartment, date: body.date, phase: body.phase, rooms } };
}

export function inspectionFilter(ownerId, query) {
  const match = { ownerId };
  const apartment = clean(query.apartment, 100);
  if (apartment) {
    match.apartment = {
      $regex: apartment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  }
  if (phases.includes(query.phase)) match.phase = query.phase;
  if (validDate(query.date)) match.date = query.date;
  return match;
}

export function inspectionKey(ownerId, id) {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id)
    ? { ownerId, _id: new ObjectId(id) }
    : null;
}

export function publicInspection({
  _id,
  apartment,
  date,
  phase,
  rooms,
  synthetic,
}) {
  return { id: _id.toString(), apartment, date, phase, rooms, synthetic };
}

export function exactApartmentFilter(ownerId, apartment) {
  const filter = inspectionFilter(ownerId, { apartment });
  if (!filter.apartment) return null;
  filter.apartment.$regex = "^" + filter.apartment.$regex + "$";
  return filter;
}
