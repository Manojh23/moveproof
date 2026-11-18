import { ObjectId } from "mongodb";

export const settlementStatuses = ["pending", "partial", "settled"];
export const settlementDemoOwner = new ObjectId("000000000000000000000002");

const text = (value, limit) =>
  typeof value === "string" && value.trim().length <= limit ? value.trim() : "";
const identifier = (value) =>
  typeof value === "string" && /^[a-z0-9-]{1,60}$/i.test(value);
const cents = (value, minimum) =>
  Number.isSafeInteger(value) && value >= minimum && value <= 100_000_000;

function dateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(value);
  return (
    Number.isFinite(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function settlementSummary({ roommates, deductions, payments }) {
  const byId = new Map(
    roommates.map((person) => [
      person.id,
      { ...person, deductedCents: 0, receivedCents: 0 },
    ]),
  );
  for (const deduction of deductions) {
    if (deduction.roommateId !== "everyone") {
      byId.get(deduction.roommateId).deductedCents += deduction.amountCents;
      continue;
    }
    const quotient = Math.floor(deduction.amountCents / roommates.length);
    const remainder = deduction.amountCents % roommates.length;
    roommates.forEach((roommate, index) => {
      byId.get(roommate.id).deductedCents +=
        quotient + Number(index < remainder);
    });
  }
  for (const payment of payments) {
    byId.get(payment.roommateId).receivedCents += payment.amountCents;
  }
  const people = [...byId.values()].map((person) => {
    const expectedCents = Math.max(
      0,
      person.contributionCents - person.deductedCents,
    );
    return {
      ...person,
      expectedCents,
      balanceCents: Math.max(0, expectedCents - person.receivedCents),
      excessCents: Math.max(0, person.receivedCents - expectedCents),
    };
  });
  const totals = {
    contributionCents: 0,
    deductedCents: 0,
    expectedCents: 0,
    receivedCents: 0,
    balanceCents: 0,
    excessCents: 0,
  };
  for (const person of people) {
    for (const key of Object.keys(totals)) totals[key] += person[key];
  }
  const status =
    totals.balanceCents === 0
      ? "settled"
      : totals.receivedCents > 0
        ? "partial"
        : "pending";
  return { people, totals, status };
}

export function validateSettlement(body) {
  const apartment = text(body?.apartment, 100);
  if (!apartment)
    return { error: "Enter an apartment name of up to 100 characters." };
  if (
    !Array.isArray(body.roommates) ||
    !body.roommates.length ||
    body.roommates.length > 20
  ) {
    return { error: "Add between one and 20 roommates." };
  }
  if (
    ![body.deductions, body.payments, body.notes].every(
      (entries) => Array.isArray(entries) && entries.length <= 40,
    )
  ) {
    return {
      error:
        "Each settlement can have up to 40 deductions, payments, and notes.",
    };
  }

  const roommates = [];
  const names = new Set();
  const ids = new Set();
  for (const entry of body.roommates) {
    const name = text(entry?.name, 60);
    const id = entry?.id;
    if (
      !name ||
      !identifier(id) ||
      id === "everyone" ||
      ids.has(id) ||
      names.has(name.toLowerCase()) ||
      !cents(entry.contributionCents, 0)
    ) {
      return {
        error: "Enter a unique name and valid contribution for each roommate.",
      };
    }
    names.add(name.toLowerCase());
    ids.add(id);
    roommates.push({ id, name, contributionCents: entry.contributionCents });
  }
  if (roommates.every((person) => person.contributionCents === 0)) {
    return {
      error: "At least one roommate must have a positive contribution.",
    };
  }

  const deductions = [];
  for (const entry of body.deductions) {
    const label = text(entry?.label, 100);
    if (
      !label ||
      !cents(entry.amountCents, 1) ||
      (!ids.has(entry.roommateId) && entry.roommateId !== "everyone")
    ) {
      return {
        error:
          "Each deduction needs a description, a positive amount, and a recipient.",
      };
    }
    deductions.push({
      label,
      roommateId: entry.roommateId,
      amountCents: entry.amountCents,
    });
  }

    const deductionSummary = settlementSummary({
    roommates,
    deductions,
    payments: [],
  });

  const overdrawnRoommate = deductionSummary.people.find(
    (person) => person.deductedCents > person.contributionCents,
  );

  if (overdrawnRoommate) {
    return {
      error: `Deductions allocated to ${overdrawnRoommate.name} exceed their deposit contribution.`,
    };
  }

  const payments = [];
  for (const entry of body.payments) {
    if (
      !ids.has(entry?.roommateId) ||
      !cents(entry.amountCents, 1) ||
      !dateOnly(entry.date)
    ) {
      return {
        error:
          "Each refund payment needs a date, a roommate, and a positive amount.",
      };
    }
    payments.push({
      date: entry.date,
      roommateId: entry.roommateId,
      amountCents: entry.amountCents,
    });
  }

  const notes = [];
  for (const entry of body.notes) {
    const note = text(entry?.note, 500);
    if (!note || !dateOnly(entry.date)) {
      return {
        error:
          "Each follow-up needs a date and a note of up to 500 characters.",
      };
    }
    notes.push({ date: entry.date, note });
  }
  const value = { apartment, roommates, deductions, payments, notes };
  return { value: { ...value, status: settlementSummary(value).status } };
}

export function publicSettlement(record) {
  return {
    id: record._id.toString(),
    apartment: record.apartment,
    roommates: record.roommates,
    deductions: record.deductions,
    payments: record.payments,
    notes: record.notes,
    revision: record.revision,
    summary: settlementSummary(record),
  };
}
