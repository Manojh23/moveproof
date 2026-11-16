import { database, ensureIndexes, mongoClient } from "../db/connection.js";
import { demoOwner, ensureDemoInspections } from "../db/inspectionData.js";

import { ensureDemoSettlements } from "../db/settlementData.js";
import { settlementDemoOwner } from "../db/settlements.js";

const db = await database();
try {
  await ensureIndexes(db);
  await Promise.all([ensureDemoInspections(db), ensureDemoSettlements(db)]);
  const count = await db
    .collection("inspections")
    .countDocuments({ ownerId: demoOwner, synthetic: true });
  console.log("Synthetic inspections:", count);
  const settlementCount = await db
    .collection("depositSettlements")
    .countDocuments({
      ownerId: settlementDemoOwner,
      synthetic: true,
    });
  console.log("Synthetic settlements:", settlementCount);
} finally {
  await (await mongoClient()).close();
}
