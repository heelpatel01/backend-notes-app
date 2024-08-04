const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
 fullName: {
  type: String,
  required: [true, "Full name is required"],
  trim: true,
 },
 email: {
  type: String,
  required: [true, "Email is required"],
  unique: true,
  trim: true,
  lowercase: true,
 },
 password: {
  type: String,
  required: [true, "Password is required"],
  minlength: 6,
 },
 createdOn: {
  type: Date,
  default: Date.now,
 },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
