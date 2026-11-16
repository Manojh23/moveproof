import { ObjectId } from "mongodb";

export const demoOwner = new ObjectId("000000000000000000000001");

const locations = [
  "Beacon Street Apartment",
  "Cedar Loft",
  "Fenway Walk-up",
  "Huntington House",
  "Mission Hill Flat",
];
const livingRoomPhoto = "/living-room.webp";

let demoSeed;

export function ensureDemoInspections(db) {
  demoSeed ??= seedInspections(db).catch((error) => {
    demoSeed = undefined;
    throw error;
  });
  return demoSeed;
}

async function seedInspections(db) {
  const records = Array.from({ length: 1000 }, (_, index) => {
    const pair = Math.floor(index / 2);
    const phase = index % 2 === 0 ? "move-in" : "move-out";
    const date = new Date(
      Date.UTC(2026, 9, 31 - (pair % 300) - (phase === "move-in" ? 90 : 0)),
    );
    const apartment =
      pair < 5
        ? locations[pair]
        : locations[pair % locations.length] + " · Unit " + (pair + 1);
    const rooms = [
      {
        name: "Living room",
        condition: phase === "move-out" ? "Fair" : "Good",
        notes:
          phase === "move-out"
            ? "Small scuff near the window."
            : "Walls and trim looked clean.",
        links: [livingRoomPhoto],
      },
      {
        name: "Kitchen",
        condition: "Good",
        notes: "Checked cabinets and counter edges.",
        links: [],
      },
      {
        name: "Bedroom",
        condition: "Good",
        notes: "Floor and closet doors inspected.",
        links: [],
      },
    ];
    if (phase === "move-in") {
      rooms.push({
        name: "Hallway",
        condition: "Fair",
        notes: "Existing scratch by the entrance.",
        links: [],
      });
    }
    return {
      _id: new ObjectId((index + 65536).toString(16).padStart(24, "0")),
      ownerId: demoOwner,
      apartment,
      phase,
      date: date.toISOString().slice(0, 10),
      rooms,
      synthetic: true,
    };
  });

  await db.collection("inspections").bulkWrite(
    records.map(({ _id, ...record }) => ({
      updateOne: {
        filter: { _id },
        update: { $setOnInsert: record },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}
