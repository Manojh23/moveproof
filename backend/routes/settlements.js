import { Router } from "express";
import { ObjectId } from "mongodb";
import {
  ensureDemoSettlements,
  ensureSettlementIndexes,
} from "../db/settlementData.js";
import {
  publicSettlement,
  settlementDemoOwner,
  settlementStatuses,
  validateSettlement,
} from "../db/settlements.js";

const router = Router();
const pageSize = 12;

router.use(async (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ error: "Sign in to view settlements." });
  if (req.user.demo) {
    if (!["GET", "HEAD"].includes(req.method)) {
      return res
        .status(403)
        .json({ error: "Create an account to save your own settlements." });
    }
  }
  req.settlementOwner = req.user.demo ? settlementDemoOwner : req.user._id;
  req.settlements = req.db.collection("depositSettlements");
  await ensureSettlementIndexes(req.settlements);
  if (req.user.demo) await ensureDemoSettlements(req.db);
  next();
});

router.get("/", async (req, res) => {
  const filter = { ownerId: req.settlementOwner };
  if (settlementStatuses.includes(req.query.status))
    filter.status = req.query.status;
  const requested = Number(req.query.page);
  const page =
    Number.isSafeInteger(requested) && requested > 0
      ? Math.min(requested, 10000)
      : 1;
  const [records, total] = await Promise.all([
    req.settlements
      .find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    req.settlements.countDocuments(filter),
  ]);
  res.json({ records: records.map(publicSettlement), total, page, pageSize });
});

router.post("/", async (req, res) => {
  const { value, error } = validateSettlement(req.body);
  if (error) return res.status(400).json({ error });
  const data = {
    ...value,
    ownerId: req.settlementOwner,
    revision: 1,
    updatedAt: new Date(),
  };
  const result = await req.settlements.insertOne(data);
  res.status(201).json(publicSettlement({ ...data, _id: result.insertedId }));
});

router.use("/:id", (req, res, next) => {
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) {
    return res.status(404).json({ error: "Settlement not found." });
  }
  req.settlementKey = {
    _id: new ObjectId(req.params.id),
    ownerId: req.settlementOwner,
  };
  next();
});

router.get("/:id", async (req, res) => {
  const record = await req.settlements.findOne(req.settlementKey);
  if (!record) return res.status(404).json({ error: "Settlement not found." });
  res.json(publicSettlement(record));
});

router.put("/:id", async (req, res) => {
  const { value, error } = validateSettlement(req.body);
  if (error) return res.status(400).json({ error });
  if (!Number.isSafeInteger(req.body.revision) || req.body.revision < 1) {
    return res
      .status(400)
      .json({ error: "Reload the settlement before editing it." });
  }
  const record = await req.settlements.findOneAndUpdate(
    { ...req.settlementKey, revision: req.body.revision },
    { $set: { ...value, updatedAt: new Date() }, $inc: { revision: 1 } },
    { returnDocument: "after" },
  );
  if (record) return res.json(publicSettlement(record));
  if (
    await req.settlements.findOne(req.settlementKey, { projection: { _id: 1 } })
  ) {
    return res.status(409).json({
      error: "This settlement changed. Reload it before saving again.",
    });
  }
  res.status(404).json({ error: "Settlement not found." });
});

router.delete("/:id", async (req, res) => {
  const result = await req.settlements.deleteOne(req.settlementKey);
  if (!result.deletedCount)
    return res.status(404).json({ error: "Settlement not found." });
  res.sendStatus(204);
});

export default router;
