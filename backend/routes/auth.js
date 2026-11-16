import { Router } from "express";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { Passport } from "passport";
import { Strategy } from "passport-local";
import { database } from "../db/connection.js";
import { ensureDemoInspections } from "../db/inspectionData.js";

export const auth = new Passport();
const router = Router();
const demo = { demo: true, name: "Demo renter" };
const dummyHash = bcrypt.hashSync("unused-dummy-login-value", 11);
const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";
const validPassword = (value) =>
  typeof value === "string" &&
  value.length >= 10 &&
  Buffer.byteLength(value) <= 72;

auth.use(
  new Strategy(
    { usernameField: "email", passReqToCallback: true },
    async (req, email, password, done) => {
      try {
        if (!validPassword(password)) return done(null, false);
        const account = await req.db
          .collection("users")
          .findOne({ email: normalizeEmail(email) });
        const verified = await bcrypt.compare(
          password,
          account?.passwordHash || dummyHash,
        );
        return done(null, verified && account ? account : false);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

auth.serializeUser((user, done) =>
  done(null, user.demo ? "demo" : user._id.toString()),
);
auth.deserializeUser(async (id, done) => {
  if (id === "demo") return done(null, demo);
  try {
    if (typeof id !== "string" || !ObjectId.isValid(id))
      return done(null, false);
    const user = await (await database())
      .collection("users")
      .findOne({ _id: new ObjectId(id) }, { projection: { passwordHash: 0 } });
    done(null, user || false);
  } catch (error) {
    done(error);
  }
});

function publicUser(user) {
  return user ? { name: user.name, demo: Boolean(user.demo) } : null;
}

function startSession(req, res, next, user, status = 200) {
  req.logIn(user, (error) => {
    if (error) return next(error);
    res.status(status).json({ user: publicUser(user) });
  });
}

router.get("/session", (req, res) => res.json({ user: publicUser(req.user) }));
router.post("/login", (req, res, next) => {
  auth.authenticate("local", (error, user) => {
    if (error) return next(error);
    if (!user)
      return res
        .status(401)
        .json({ error: "Check your email address and password." });
    startSession(req, res, next, user);
  })(req, res, next);
});

router.post("/register", async (req, res, next) => {
  const { name, email, password } = req.body ?? {};
  const address = normalizeEmail(email);
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 70 ||
    address.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ||
    !validPassword(password)
  ) {
    return res.status(400).json({
      error:
        "Enter a name, a valid email, and a password of 10 or more characters (up to 72 bytes).",
    });
  }
  const account = {
    name: name.trim(),
    email: address,
    passwordHash: await bcrypt.hash(password, 11),
  };
  try {
    const { insertedId } = await req.db.collection("users").insertOne(account);
    startSession(req, res, next, { ...account, _id: insertedId }, 201);
  } catch (error) {
    if (error.code === 11000)
      return res
        .status(409)
        .json({ error: "An account already uses that email." });
    next(error);
  }
});

router.post("/demo", async (req, res, next) => {
  await ensureDemoInspections(req.db);
  startSession(req, res, next, demo);
});

router.post("/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("moveproof.sid", { path: "/" });
    res.sendStatus(204);
  });
});

export default router;
