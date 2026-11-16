import { database, ensureIndexes, mongoClient } from "../db/connection.js";
import { demoOwner, ensureDemoInspections } from "../db/inspectionData.js";

const db = await database();
try {
  await ensureIndexes(db);
  await ensureDemoInspections(db);
  const count = await db
    .collection("inspections")
    .countDocuments({ ownerId: demoOwner, synthetic: true });
  console.log("Synthetic inspections:", count);
} finally {
  await (await mongoClient()).close();
}
