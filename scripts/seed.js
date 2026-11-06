const bcrypt = require("bcryptjs");
require("dotenv").config();
const connectDb = require("../lib/db");
const { City, Operator, User, Bus, Route, Trip } = require("../lib/models");

async function seed() {
  if (process.env.NODE_ENV === "production" &&
    (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_OPERATOR_PASSWORD)) {
    throw new Error("Set SEED_ADMIN_PASSWORD and SEED_OPERATOR_PASSWORD before production seeding");
  }
  await connectDb();
  const cityData = [
    ["Toshkent", "Toshkent shahri", "toshkent"],
    ["Samarqand", "Samarqand viloyati", "samarqand"],
    ["Buxoro", "Buxoro viloyati", "buxoro"],
    ["Farg'ona", "Farg'ona viloyati", "fargona"],
    ["Andijon", "Andijon viloyati", "andijon"],
    ["Namangan", "Namangan viloyati", "namangan"],
    ["Qarshi", "Qashqadaryo viloyati", "qarshi"],
    ["Nukus", "Qoraqalpog'iston", "nukus"]
  ];
  const cities = {};
  for (const [name, region, slug] of cityData) {
    cities[slug] = await City.findOneAndUpdate({ slug }, { $set: { name, region } }, { upsert: true, new: true });
  }

  const operator = await Operator.findOneAndUpdate(
    { name: "BusTicket Demo" },
    { $set: { legalName: "BusTicket Demo MChJ", status: "active", commissionPercent: 10 } },
    { upsert: true, new: true }
  );
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin123!demo";
  const operatorPassword = process.env.SEED_OPERATOR_PASSWORD || "Operator123!demo";
  await User.findOneAndUpdate(
    { phone: "+998900000001" },
    { $set: { name: "Demo Admin", passwordHash: await bcrypt.hash(adminPassword, 12), role: "admin", isPhoneVerified: true } },
    { upsert: true, new: true }
  );
  await User.findOneAndUpdate(
    { phone: "+998900000002" },
    { $set: { name: "Demo Operator", passwordHash: await bcrypt.hash(operatorPassword, 12), role: "operator", operatorId: operator._id, isPhoneVerified: true } },
    { upsert: true, new: true }
  );

  const layout = { rows: 10, cols: 5, cells: [] };
  for (let row = 1; row <= 10; row++) {
    layout.cells.push(
      { row, col: 1, kind: "seat", seatNumber: String((row - 1) * 4 + 1) },
      { row, col: 2, kind: "seat", seatNumber: String((row - 1) * 4 + 2) },
      { row, col: 3, kind: "aisle" },
      { row, col: 4, kind: "seat", seatNumber: String((row - 1) * 4 + 3) },
      { row, col: 5, kind: "seat", seatNumber: String((row - 1) * 4 + 4) }
    );
  }
  layout.cells.push({ row: 11, col: 1, kind: "driver" });
  const bus = await Bus.findOneAndUpdate(
    { operatorId: operator._id, plateNumber: "01 A 001 AA" },
    { $set: { model: "Yutong", type: "comfort", layout, seatCount: 40 } },
    { upsert: true, new: true }
  );
  const route = await Route.findOneAndUpdate(
    { operatorId: operator._id, fromCityId: cities.toshkent._id, toCityId: cities.samarqand._id },
    { $set: { durationMinutes: 240, distanceKm: 300, stops: [] } },
    { upsert: true, new: true }
  );
  const departAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  departAt.setMinutes(0, 0, 0);
  const arriveAt = new Date(departAt.getTime() + 4 * 60 * 60 * 1000);
  await Trip.findOneAndUpdate(
    { routeId: route._id, busId: bus._id, departAt },
    { $set: { operatorId: operator._id, arriveAt, price: 75000, status: "scheduled" } },
    { upsert: true, new: true }
  );
  console.log("Seed complete. Cities, demo operator, bus, route, and trip are ready.");
  if (process.env.NODE_ENV !== "production") {
    console.log("Demo admin: +998900000001 / Admin123!demo");
    console.log("Demo operator: +998900000002 / Operator123!demo");
  }
}

seed().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
