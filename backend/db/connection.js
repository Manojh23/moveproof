import { MongoClient } from "mongodb";

let connection;

export function mongoClient() {
  if (!connection) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("Set MONGODB_URI in the server environment.");
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    connection = client.connect().catch(async (error) => {
      connection = undefined;
      await client.close();
      throw error;
    });
  }
  return connection;
}

export async function database() {
  return (await mongoClient()).db(process.env.MONGODB_DB || "moveproof");
}

let indexes;

export function ensureIndexes(db) {
  indexes ??= Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("inspections").createIndex({ ownerId: 1, date: -1, _id: -1 }),
    db
      .collection("sessions")
      .createIndex({ expires: 1 }, { expireAfterSeconds: 0 }),
  ]).catch((error) => {
    indexes = undefined;
    throw error;
  });
  return indexes;
}
