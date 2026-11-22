import mongoose from "mongoose";

export const SOURCES = ["Website", "Referral", "Cold Call", "Email Campaign", "Social Media", "Event", "Other"];
export const STATUSES = ["New", "Contacted", "Qualified", "Lost"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// lead schema
const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [EMAIL_RE, "Enter a valid email address"],
    },
    phone: { type: String, trim: true, maxlength: 10 },
    company: { type: String, trim: true, maxlength: 120 },
    source: { type: String, enum: SOURCES, default: "Other" },
    status: { type: String, enum: STATUSES, default: "New" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

// every list query is scoped to one owner, often filtered by status
leadSchema.index({ owner: 1, status: 1, createdAt: -1 });
leadSchema.index({ owner: 1, name: 1 });

// one user cannot save the same contact twice
leadSchema.index({ owner: 1, email: 1 }, { unique: true });

// hide mongo fields in responses
leadSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Lead = mongoose.model("Lead", leadSchema);
