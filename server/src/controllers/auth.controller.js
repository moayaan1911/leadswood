import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env.config.js";
import { User } from "../models/user.model.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = "7d";

const signToken = (user) => jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: TOKEN_EXPIRY });

// returns the first problem with a password, or an empty string
function passwordProblem(password) {
  if (!password) return "Password is required";
  if (password.length < 8) return "Use at least 8 characters";
  if (password.length > 72) return "Use at most 72 characters";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Use at least one letter and one number";
  }
  return "";
}

// signup
export async function signup(req, res) {
  const { name, email, password } = req.body;

  const errors = [];
  if (!name?.trim()) errors.push({ field: "name", message: "Name is required" });
  if (!email?.trim()) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.push({ field: "email", message: "Enter a valid email address" });
  }
  const problem = passwordProblem(password);
  if (problem) errors.push({ field: "password", message: problem });

  if (errors.length) {
    throw Object.assign(new Error("Validation failed"), {
      status: 400,
      code: "VALIDATION_ERROR",
      errors,
    });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name: name.trim(), email: email.trim(), passwordHash });

  res.status(201).json({
    success: true,
    message: "Account created",
    data: { user, token: signToken(user) },
  });
}

// login
export async function login(req, res) {
  const { email, password } = req.body;

  const errors = [];
  if (!email?.trim()) errors.push({ field: "email", message: "Email is required" });
  if (!password) errors.push({ field: "password", message: "Password is required" });

  if (errors.length) {
    throw Object.assign(new Error("Validation failed"), {
      status: 400,
      code: "VALIDATION_ERROR",
      errors,
    });
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
  const matches = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!matches) {
    throw Object.assign(new Error("Invalid email or password"), {
      status: 401,
      code: "UNAUTHORIZED",
    });
  }

  res.json({ success: true, message: "Signed in", data: { user, token: signToken(user) } });
}

// current user
export async function me(req, res) {
  res.json({ success: true, data: req.user });
}

// update own profile (name and/or password)
export async function updateUser(req, res) {
  const { name, currentPassword, newPassword } = req.body;

  if (name === undefined && !newPassword) {
    throw Object.assign(new Error("Nothing to update"), { status: 400, code: "VALIDATION_ERROR" });
  }

  const errors = [];
  if (name !== undefined && !name.trim()) {
    errors.push({ field: "name", message: "Name is required" });
  }
  if (newPassword) {
    const problem = passwordProblem(newPassword);
    if (problem) errors.push({ field: "newPassword", message: problem });
    if (!currentPassword) {
      errors.push({ field: "currentPassword", message: "Enter your current password" });
    }
  }

  if (errors.length) {
    throw Object.assign(new Error("Validation failed"), {
      status: 400,
      code: "VALIDATION_ERROR",
      errors,
    });
  }

  // the hash is hidden by default, so it has to be asked for explicitly
  const user = await User.findById(req.user.id).select("+passwordHash");

  if (name !== undefined) user.name = name.trim();

  if (newPassword) {
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw Object.assign(new Error("Validation failed"), {
        status: 400,
        code: "VALIDATION_ERROR",
        errors: [{ field: "currentPassword", message: "Current password is incorrect" }],
      });
    }
    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  }

  await user.save();

  res.json({ success: true, message: "Profile updated", data: { user } });
}
