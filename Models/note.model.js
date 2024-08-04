const mongoose = require("mongoose");

const notesSchema = new mongoose.Schema({
 title: { type: String, required: true },
 content: {
  type: String,
  required: true,
 },
 isPinned: {
  type: Boolean,
  default: false,
 },
 tags: {
  type: [String],
  default: [],
 },
 userId: {
  type: String,
 },
createdOn: {
  type: Date,
  default: new Date(),
},
});

const Note = mongoose.model("Note", notesSchema);
module.exports = Note;
