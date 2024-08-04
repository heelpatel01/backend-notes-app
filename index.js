require("dotenv").config();

const User = require("./Models/user.models");
const Note = require("./Models/note.model");

const config = require("./config.json");
const mongoose = require("mongoose");

mongoose
 .connect(config.connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
 })
 .then(() => console.log("DB Connected"))
 .catch((err) => console.error("DB Connection Error: ", err));

const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const { authenticationToken } = require("./utility");

app.use(express.json());
app.use(cors({ origin: "*" })); // For production, restrict the origins allowed

app.get("/", (req, res) => {
 res.json("Hanuman");
});

app.post("/create-user", async (req, res) => {
 const { email, fullName, password } = req.body;

 if (!email || !fullName || !password) {
  return res.status(400).json({
   error: true,
   message: "Email, full name, and password are required.",
  });
 }

 try {
  const exists = await User.findOne({ email });

  if (exists) {
   return res.status(400).json({
    error: true,
    message: "User with this email already exists.",
   });
  }

  const user = await User.create({ fullName, email, password });

  const accessToken = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
   expiresIn: "36000m",
  });

  return res.json({
   error: false,
   user,
   accessToken,
   message: "User registered successfully.",
  });
 } catch (error) {
  console.error("Error creating user: ", error);
  return res.status(500).json({
   error: true,
   message: "Internal server error.",
  });
 }
});

app.post("/login", async (req, res) => {
 const { email, password } = req.body;

 if (!email || !password) {
  return res.status(400).json({
   error: true,
   message: "Email and password are required to login.",
  });
 }

 try {
  const userInfo = await User.findOne({ email });

  if (!userInfo || userInfo.password !== password) {
   return res
    .status(404)
    .json({ error: true, message: "Invalid credentials." });
  }

  const user = { user: userInfo };
  const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
   expiresIn: "36000m",
  });

  return res.json({
   error: false,
   message: "User login successful.",
   email,
   accessToken,
  });
 } catch (error) {
  console.error("Error during login: ", error);
  return res.status(500).json({
   error: true,
   message: "Internal server error.",
  });
 }
});

app.get("/get-user", authenticationToken, async (req, res) => {
 const { user } = req.user;

 try {
  const isUser = await User.findById(user._id);

  if (!isUser) {
   return res.status(401).json({
    error: true,
    message: "User not found.",
   });
  }

  return res.status(200).json({
   error: false,
   message: "User found.",
   user: {
    fullName: isUser.fullName,
    email: isUser.email,
    id: isUser._id,
    createdOn: isUser.createdOn,
   },
  });
 } catch (error) {
  console.error("Error fetching user: ", error);
  return res.status(500).json({
   error: true,
   message: "Internal server error.",
  });
 }
});

app.post("/add-note", authenticationToken, async (req, res) => {
 const { title, content, tags } = req.body;
 const { user } = req.user;

 if (!title || !content) {
  return res.status(400).json({
   error: true,
   message: "Title and content are required.",
  });
 }

 try {
  const note = new Note({
   userId: user._id,
   content,
   title,
   tags: tags || [],
  });

  await note.save();

  return res.status(200).json({
   error: false,
   message: "Note added successfully.",
   note,
  });
 } catch (error) {
  console.error("Error adding note: ", error);
  return res.status(500).json({
   error: true,
   message: "Internal server error.",
  });
 }
});

app.put("/edit-note/:id", authenticationToken, async (req, res) => {
 const { id: noteId } = req.params;
 const { title, content, tags, isPinned } = req.body;
 const { user } = req.user;

 if (!title && !content && !tags) {
  return res.status(400).json({
   error: true,
   message: "No changes provided.",
  });
 }

 try {
  const note = await Note.findOne({ _id: noteId, userId: user._id });

  if (!note) {
   return res.status(404).json({ error: true, message: "Note not found." });
  }

  if (title) note.title = title;
  if (content) note.content = content;
  if (tags) note.tags = tags;
  if (isPinned !== undefined) note.isPinned = isPinned;

  await note.save();

  return res.status(200).json({
   error: false,
   message: "Note updated successfully.",
   note,
  });
 } catch (error) {
  console.error("Error updating note: ", error);
  return res.status(500).json({
   error: true,
   message: "Internal server error.",
  });
 }
});

app.get("/fetch-all-notes", authenticationToken, async (req, res) => {
 const { user } = req.user;

 try {
  const notes = await Note.find({ userId: user._id });

  return res.status(200).json({
   error: false,
   message: "Notes fetched successfully.",
   notes,
  });
 } catch (error) {
  console.error("Error fetching notes: ", error);
  return res.status(500).json({
   error: true,
   message: "Internal server error.",
  });
 }
});

app.delete("/delete-note/:id", authenticationToken, async (req, res) => {
 const { user } = req.user;
 const { id: noteId } = req.params;

 try {
  await Note.findOneAndDelete({ _id: noteId, userId: user._id });

  return res.status(200).json({
   error: false,
   message: "Note deleted successfully.",
  });
 } catch (error) {
  console.error("Error deleting note: ", error);
  return res.status(500).json({
   error: true,
   message: "Internal server error.",
  });
 }
});

app.put("/isPinned/:id", authenticationToken, async (req, res) => {
 const { user } = req.user;
 const { id: noteId } = req.params;

 try {
  const note = await Note.findOne({ _id: noteId, userId: user._id });

  if (!note) {
   return res.status(404).json({
    error: true,
    message: "Note not found.",
   });
  }

  note.isPinned = !note.isPinned;
  const updatedNote = await note.save();

  return res.status(200).json({
   error: false,
   message: "Note pin status updated successfully.",
   note: updatedNote,
  });
 } catch (error) {
  console.error("Error updating pin status: ", error);
  return res.status(500).json({
   error: true,
   message: "Internal server error.",
  });
 }
});

app.listen(process.env.PORT || 8000, () => {
 console.log(
  `Server is running at http://localhost:${process.env.PORT || 8000}/`
 );
});

module.exports = app;
