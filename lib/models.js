const mongoose = require("mongoose");

const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["passenger", "operator", "controller", "admin"], default: "passenger" },
  operatorId: { type: Schema.Types.ObjectId, ref: "Operator" },
  isPhoneVerified: { type: Boolean, default: false },
  otpCode: String,
  otpExpiresAt: Date
}, { timestamps: true });

const operatorSchema = new Schema({
  name: { type: String, required: true, trim: true },
  legalName: String,
  inn: String,
  phone: String,
  status: { type: String, enum: ["pending", "active", "blocked"], default: "pending" },
  commissionPercent: { type: Number, min: 0, max: 100, default: 10 }
}, { timestamps: true });

const citySchema = new Schema({
  name: { type: String, required: true, trim: true },
  region: String,
  slug: { type: String, required: true, unique: true }
}, { timestamps: true });

const busSchema = new Schema({
  operatorId: { type: Schema.Types.ObjectId, ref: "Operator", required: true, index: true },
  plateNumber: { type: String, required: true, trim: true },
  model: { type: String, required: true },
  type: { type: String, enum: ["standard", "comfort", "vip"], default: "standard" },
  layout: {
    rows: { type: Number, required: true, min: 1, max: 30 },
    cols: { type: Number, required: true, min: 1, max: 6 },
    cells: [{
      row: Number, col: Number,
      kind: { type: String, enum: ["seat", "aisle", "driver", "empty"], required: true },
      seatNumber: String
    }]
  },
  seatCount: { type: Number, required: true, min: 1 }
}, { timestamps: true });

const routeSchema = new Schema({
  operatorId: { type: Schema.Types.ObjectId, ref: "Operator", required: true, index: true },
  fromCityId: { type: Schema.Types.ObjectId, ref: "City", required: true },
  toCityId: { type: Schema.Types.ObjectId, ref: "City", required: true },
  stops: [{ cityId: Schema.Types.ObjectId, order: Number, offsetMinutes: Number }],
  distanceKm: { type: Number, min: 1 },
  durationMinutes: { type: Number, required: true, min: 1 }
}, { timestamps: true });

const tripSchema = new Schema({
  routeId: { type: Schema.Types.ObjectId, ref: "Route", required: true, index: true },
  busId: { type: Schema.Types.ObjectId, ref: "Bus", required: true },
  operatorId: { type: Schema.Types.ObjectId, ref: "Operator", required: true, index: true },
  departAt: { type: Date, required: true, index: true },
  arriveAt: { type: Date, required: true },
  price: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["scheduled", "boarding", "departed", "completed", "cancelled"], default: "scheduled", index: true }
}, { timestamps: true });
tripSchema.index({ routeId: 1, departAt: 1 });

const seatLockSchema = new Schema({
  tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
  seatNumber: { type: String, required: true },
  bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
  status: { type: String, enum: ["pending", "paid"], required: true },
  expiresAt: Date
}, { timestamps: true });
seatLockSchema.index({ tripId: 1, seatNumber: 1 }, { unique: true });

const bookingSchema = new Schema({
  code: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
  passengers: [{
    seatNumber: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    phone: { type: String, required: true },
    document: String
  }],
  totalPrice: { type: Number, required: true },
  status: { type: String, enum: ["pending", "paid", "expired", "cancelled", "used"], default: "pending", index: true },
  expiresAt: Date,
  paidAt: Date,
  cancelledAt: Date
}, { timestamps: true });

const ticketSchema = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
  seatNumber: { type: String, required: true },
  ticketNumber: { type: String, required: true, unique: true },
  qrHash: { type: String, required: true },
  status: { type: String, enum: ["valid", "used", "cancelled"], default: "valid" },
  usedAt: Date,
  checkedBy: { type: Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });
ticketSchema.index({ bookingId: 1, seatNumber: 1 }, { unique: true });

const paymentSchema = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
  amount: { type: Number, required: true },
  provider: { type: String, enum: ["click", "payme", "mock"], default: "mock" },
  providerTransactionId: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ["created", "success", "failed", "refunded", "partially_refunded"], default: "created" },
  refundAmount: { type: Number, default: 0 }
}, { timestamps: true });

const auditLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: String,
  meta: Schema.Types.Mixed
}, { timestamps: true });

const rateLimitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true },
  resetAt: { type: Date, required: true, expires: 0 }
}, { timestamps: true });

function model(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}

module.exports = {
  User: model("User", userSchema),
  Operator: model("Operator", operatorSchema),
  City: model("City", citySchema),
  Bus: model("Bus", busSchema),
  Route: model("Route", routeSchema),
  Trip: model("Trip", tripSchema),
  SeatLock: model("SeatLock", seatLockSchema),
  Booking: model("Booking", bookingSchema),
  Ticket: model("Ticket", ticketSchema),
  Payment: model("Payment", paymentSchema),
  AuditLog: model("AuditLog", auditLogSchema),
  RateLimit: model("RateLimit", rateLimitSchema)
};
