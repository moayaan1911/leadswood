import { Lead, SOURCES, STATUSES } from "../models/lead.model.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\d{10}$/;
const FIELDS = ["name", "email", "phone", "company", "source", "status"];
const SORTABLE = ["name", "email", "company", "status", "createdAt", "updatedAt"];

// keeps client input to the fields a lead may change, so owner can never be sent from outside
const pick = (body) =>
  Object.fromEntries(FIELDS.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));

// search runs as a regex, so user input has to be escaped first
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const notFound = () => Object.assign(new Error("Lead not found"), { status: 404, code: "NOT_FOUND" });

const validationError = (errors) =>
  Object.assign(new Error("Validation failed"), { status: 400, code: "VALIDATION_ERROR", errors });

function validateLead(values) {
  const errors = [];

  if (!values.name?.trim()) errors.push({ field: "name", message: "Name is required" });
  if (!values.email?.trim()) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!EMAIL_RE.test(values.email.trim())) {
    errors.push({ field: "email", message: "Enter a valid email address" });
  }
  if (values.phone?.trim() && !PHONE_RE.test(values.phone.trim())) {
    errors.push({ field: "phone", message: "Phone must be 10 digits" });
  }
  if (values.source !== undefined && !SOURCES.includes(values.source)) {
    errors.push({ field: "source", message: "Unknown source" });
  }
  if (values.status !== undefined && !STATUSES.includes(values.status)) {
    errors.push({ field: "status", message: "Unknown status" });
  }

  return errors;
}

// list with search, status filter, sorting and pagination
export async function listLeads(req, res) {
  const { search = "", status = "All", page = "1", limit = "10", sort = "createdAt", order = "desc" } = req.query;

  const query = { owner: req.user.id };
  if (status !== "All") query.status = status;
  if (search.trim()) {
    const term = new RegExp(escapeRegex(search.trim()), "i");
    query.$or = [{ name: term }, { email: term }, { company: term }];
  }

  const perPage = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const currentPage = Math.max(Number(page) || 1, 1);
  const field = SORTABLE.includes(sort) ? sort : "createdAt";
  const direction = order === "asc" ? 1 : -1;

  const [leads, total] = await Promise.all([
    Lead.find(query)
      .sort({ [field]: direction })
      .skip((currentPage - 1) * perPage)
      .limit(perPage),
    Lead.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: leads,
    meta: {
      page: currentPage,
      limit: perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      hasNextPage: currentPage * perPage < total,
      hasPrevPage: currentPage > 1,
    },
  });
}

// lead count per status, for the dashboard
export async function leadStats(req, res) {
  const rows = await Lead.aggregate([
    { $match: { owner: req.user._id } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  let total = 0;
  for (const row of rows) {
    byStatus[row._id] = row.count;
    total += row.count;
  }

  res.json({ success: true, data: { total, byStatus } });
}

// one lead of the signed-in user
export async function getLead(req, res) {
  const lead = await Lead.findOne({ _id: req.params.id, owner: req.user.id });
  if (!lead) throw notFound();
  res.json({ success: true, data: lead });
}

// create
export async function createLead(req, res) {
  const values = pick(req.body);
  const errors = validateLead(values);
  if (errors.length) throw validationError(errors);

  const lead = await Lead.create({ ...values, owner: req.user.id });
  res.status(201).json({ success: true, message: "Lead created", data: lead });
}

// update
export async function updateLead(req, res) {
  const lead = await Lead.findOne({ _id: req.params.id, owner: req.user.id });
  if (!lead) throw notFound();

  Object.assign(lead, pick(req.body));

  const errors = validateLead(lead);
  if (errors.length) throw validationError(errors);

  await lead.save();
  res.json({ success: true, message: "Lead updated", data: lead });
}

// delete
export async function deleteLead(req, res) {
  const lead = await Lead.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!lead) throw notFound();
  res.json({ success: true, message: "Lead deleted", data: null });
}
