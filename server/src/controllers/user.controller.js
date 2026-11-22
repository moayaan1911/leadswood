import { User } from "../models/user.model.js";

// list all users
export async function listUsers(req, res) {
  const users = await User.find();
  res.json({ success: true, data: users });
}

// get one user
export async function getUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw Object.assign(new Error("User not found"), { status: 404, code: "NOT_FOUND" });
  }
  res.json({ success: true, data: user });
}

// update user name
export async function updateUser(req, res) {
  const { name } = req.body;

  if (!name?.trim()) {
    throw Object.assign(new Error("Validation failed"), {
      status: 400,
      code: "VALIDATION_ERROR",
      errors: [{ field: "name", message: "Name is required" }],
    });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name: name.trim() },
    { new: true, runValidators: true },
  );

  if (!user) {
    throw Object.assign(new Error("User not found"), { status: 404, code: "NOT_FOUND" });
  }

  res.json({ success: true, message: "User updated", data: user });
}

// delete user
export async function deleteUser(req, res) {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    throw Object.assign(new Error("User not found"), { status: 404, code: "NOT_FOUND" });
  }
  res.json({ success: true, message: "User deleted", data: null });
}
