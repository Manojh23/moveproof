import { ObjectId } from "mongodb";
import { settlementDemoOwner, settlementSummary } from "./settlements.js";

let seeded;
let indexes;

export function ensureSettlementIndexes(collection) {
  indexes ??= collection
    .createIndexes([
      { key: { ownerId: 1, updatedAt: -1, _id: -1 } },
      { key: { ownerId: 1, status: 1, updatedAt: -1, _id: -1 } },
    ])
    .catch((error) => {
      indexes = undefined;
      throw error;
    });
  return indexes;
}

export function ensureDemoSettlements(db) {
  seeded ??= seedSettlements(db).catch((failure) => {
    seeded = undefined;
    throw failure;
  });
  return seeded;
}

async function seedSettlements(db) {
  const records = Array.from({ length: 1000 }, (_, index) => {
    const record = {
      apartment:
        index === 0
          ? "Beacon Street Apartment"
          : "Sample apartment " + (index + 1),
      roommates: [
        { id: "daniel", name: "Daniel", contributionCents: 85000 },
        { id: "maya", name: "Maya", contributionCents: 65000 },
      ],
      deductions: [
        {
          label: "Agreed cleaning cost",
          roommateId: "everyone",
          amountCents: 12000,
        },
        { label: "Replacement key", roommateId: "daniel", amountCents: 6000 },
      ],
      payments:
        index % 3 === 2
          ? []
          : [
              {
                date: "2026-11-09",
                roommateId: "daniel",
                amountCents: index % 3 === 1 ? 73000 : 50000,
              },
              {
                date: "2026-11-12",
                roommateId: "maya",
                amountCents: index % 3 === 1 ? 59000 : 40000,
              },
            ],
      notes: [
        {
          date: "2026-11-13",
          note: "Roommates reviewed the itemized deductions together.",
        },
      ],
    };
    return {
      updateOne: {
        filter: {
          _id: new ObjectId((index + 131072).toString(16).padStart(24, "0")),
        },
        update: {
          $setOnInsert: {
            ...record,
            ownerId: settlementDemoOwner,
            synthetic: true,
            revision: 1,
            status: settlementSummary(record).status,
            updatedAt: new Date(Date.UTC(2026, 10, 15) - index * 60000),
          },
        },
        upsert: true,
      },
    };
  });

  await db
    .collection("depositSettlements")
    .bulkWrite(records, { ordered: false });
}
