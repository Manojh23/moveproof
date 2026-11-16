import { Router } from "express";
import { demoOwner } from "../db/inspectionData.js";
import {
  exactApartmentFilter,
  inspectionFilter,
  inspectionKey,
  publicInspection,
  validateInspection,
} from "../db/inspections.js";

const router = Router();
const pageSize = 12;

router.use((req, res, next) => {
  if (!req.user)
    return res.status(401).json({ error: "Sign in to access inspections." });
  if (req.user.demo && !["GET", "HEAD"].includes(req.method)) {
    return res
      .status(403)
      .json({ error: "Create an account to save your own inspections." });
  }
  req.ownerId = req.user.demo ? demoOwner : req.user._id;
  req.inspections = req.db.collection("inspections");
  next();
});

router.get("/", async (req, res) => {
  const filter = inspectionFilter(req.ownerId, req.query);
  const requested = Number(req.query.page);
  const page =
    Number.isSafeInteger(requested) && requested > 0
      ? Math.min(requested, 10000)
      : 1;
  const [records, total] = await Promise.all([
    req.inspections
      .find(filter)
      .sort({ date: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    req.inspections.countDocuments(filter),
  ]);
  res.json({ records: records.map(publicInspection), total, page, pageSize });
});

router.get("/choices", async (req, res) => {
  const filter = exactApartmentFilter(req.ownerId, req.query.apartment);
  if (!filter)
    return res.status(400).json({ error: "Enter the exact apartment name." });
  const records = await req.inspections
    .find(filter, {
      projection: { date: 1, phase: 1 },
    })
    .sort({ date: -1, _id: -1 })
    .toArray();
  res.json({
    records: records.map(({ _id, date, phase }) => ({
      id: _id.toString(),
      date,
      phase,
    })),
  });
});

router.post("/", async (req, res) => {
  const { record, error } = validateInspection(req.body);
  if (error) return res.status(400).json({ error });
  const stored = { ...record, ownerId: req.ownerId };
  const result = await req.inspections.insertOne(stored);
  res.status(201).json(publicInspection({ ...stored, _id: result.insertedId }));
});

router.use("/:id", (req, res, next) => {
  req.inspectionKey = inspectionKey(req.ownerId, req.params.id);
  if (!req.inspectionKey)
    return res.status(404).json({ error: "Inspection not found." });
  next();
});

router.get("/:id", async (req, res) => {
  const record = await req.inspections.findOne(req.inspectionKey);
  if (!record) return res.status(404).json({ error: "Inspection not found." });
  res.json(publicInspection(record));
});

router.put("/:id", async (req, res) => {
  const { record, error } = validateInspection(req.body);
  if (error) return res.status(400).json({ error });
  const updated = await req.inspections.findOneAndUpdate(
    req.inspectionKey,
    { $set: record },
    { returnDocument: "after" },
  );
  if (!updated) return res.status(404).json({ error: "Inspection not found." });
  res.json(publicInspection(updated));
});

router.delete("/:id", async (req, res) => {
  const result = await req.inspections.deleteOne(req.inspectionKey);
  if (!result.deletedCount)
    return res.status(404).json({ error: "Inspection not found." });
  res.sendStatus(204);
});

export default router;
