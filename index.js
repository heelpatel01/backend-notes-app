require("dotenv").config();

const User = require("./Models/user.models");
const Note = require("./Models/note.model");

const config = require("./config.json");
const mongoose = require("mongoose");

mongoose
 .connect(config.connectionString)
 .then(() => console.log("DB Connected"));

const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const { authenticationToken } = require("./utility");

app.use(express.json());

app.use(cors({ origin: "*" }));

app.get("/", (req, res) => {
 res.json("Hanuman");
});

app.post("/create-user", async (req, res) => {
 const { email, fullName, password } = req.body;

 if (!email) {
  return res
   .status(400)
   .json({ error: true, message: "email is required!!! " });
 }

 if (!fullName) {
  return res
   .status(400)
   .json({ error: true, message: "user name is required!!! " });
 }

 if (!password) {
  return res
   .status(400)
   .json({ error: true, message: "password is required!!! " });
 }

 //check if already exists or not

 const exists = await User.findOne({ email });

 if (exists) {
  return res.status(400).json({
   error: true,
   message: "user with this email already exists",
  });
 }

 const user = await User.create({ fullName, email, password });

 await user.save();

 const accessToken = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
  expiresIn: "36000m",
 });

 return res.json({
  error: false,
  user,
  accessToken,
  message: "User Registered Successfully !!!! ",
 });
});

// app.post("/login", async (req, res) => {
//  const { email, password } = req.body;

//  if (!email) {
//   return res.status(400).json({
//    error: true,
//    message: "Email is required to login.",
//   });
//  }

//  if (!password) {
//   return res.status(400).json({
//    error: true,
//    message: "Please enter password.",
//   });
//  }

//  const userInfo = await User.findOne({ email });

//  if (userInfo.email === email && password === userInfo.password) {
//   const user = { user: userInfo };
//   const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
//    expiresIn: "36000m",
//   });

//   return res.json({
//    error: false,
//    message: "User Login Successfully !",
//    email,
//    accessToken,
//   });
//  }

//  return res.status(404).json({ error: true, message: "Invalid Credentials !" });
// });

//login -2

app.post("/login", async (req, res) => {
 const { email, password } = req.body;

 if (!email) {
  return res.status(400).json({
   error: true,
   message: "Email is required to login.",
  });
 }

 if (!password) {
  return res.status(400).json({
   error: true,
   message: "Please enter password.",
  });
 }

 try {
  const userInfo = await User.findOne({ email });

  if (!userInfo) {
   return res
    .status(404)
    .json({ error: true, message: "Invalid Credentials!" });
  }

  if (userInfo.email === email && password === userInfo.password) {
   const user = { user: userInfo };
   const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "36000m",
   });

   return res.json({
    error: false,
    message: "User Login Successfully!",
    email,
    accessToken,
   });
  } else {
   return res
    .status(404)
    .json({ error: true, message: "Invalid Credentials!" });
  }
 } catch (error) {
  console.error(error); // Log the error for debugging
  return res.status(500).json({
   error: true,
   message: "Internal Server Error!",
  });
 }
});

//Get user info
app.get("/get-user", authenticationToken, async (req, res) => {
 const { user } = req.user;

 try {
  const isUser = await User.findById(user._id);

  if (!isUser) {
   return res.status(401).json({
    error: true,
    message: "User Not Found!",
   });
  }

  return res.status(200).json({
   error: false,
   message: "User Found ✅",
   user: {
    fullName: isUser.fullName,
    email: isUser.email,
    id: isUser._id,
    createdOn: isUser.createdOn,
   },
  });
 } catch (error) {
  console.error(error);
  return res.status(500).json({
   error: true,
   message: "Internal Server Error!",
  });
 }
});

app.post("/add-note", authenticationToken, async (req, res) => {
 const { title, content, tags } = req.body;
 const { user } = req.user;
 console.log("Request xUser: ", req.headers);
 console.log("Request User: ", req.user);
 //  console.log("Request body: ", req.body);
 //check if everything is written or not

 if (!title) {
  return res.status(400).json({
   error: true,
   message: "title is required !!!",
  });
 }

 if (!content) {
  return res.status(400).json({
   error: true,
   message: "content is requires !!!",
  });
 }

 try {
  const note = new Note({
   userId: user._id,
   content,
   title,
   tags: tags || [],
  });
  note.save();
  return res.status(200).json({
   error: false,
   message: "Note added successfully",
   user: user._id,
   note: note,
  });
 } catch (error) {
  console.log(error);
  return res.status(400).json({
   error: true,
   message: "Internal Server Error!",
  });
 }
});

app.put("/edit-note/:id", authenticationToken, async (req, res) => {
 const noteId = req.params.id;
 const { title, content, tags, isPinned } = req.body;
 const { user } = req.user;

 //  console.log(req)

 if (!title && !content && !tags) {
  return res.status(400).json({
   error: true,
   messag: "no changes provided! ",
  });
 }

 try {
  const note = await Note.findOne({ _id: noteId, userId: user._id });

  if (!note) {
   return res.status(404).json({ error: true, message: "Note not found" });
  }

  if (title) note.title = title;
  if (content) note.content = content;
  if (tags) note.tags = tags;
  if (isPinned) note.isPinned = isPinned;

  await note.save();

  return res.status(200).json({
   error: false,
   message: "Notes Updated Successfully!",
   note: note,
  });
 } catch (error) {
  console.log(error);
  return res.status(500).json({
   error: true,
   message: "Internal Server Error",
  });
 }
});

app.get("/fetch-all-notes", authenticationToken, async (req, res) => {
 const { user } = req.user;
 console.log(user);

 try {
  const notes = await Note.find({ userId: user._id });

  if (notes) {
   return res
    .status(200)
    .json({ error: false, message: "Fetching Successfully!!!", notes });
  }
 } catch (error) {
  console.log(error);
  return res.status(500).json({
   error: true,
   message: "Internal Server Error!",
  });
 }
});

app.delete("/delete-note/:id", authenticationToken, async (req, res) => {
 const { user } = req.user;
 const noteId = req.params.id;

 await Note.findOneAndDelete({ _id: noteId, userId: user._id })
  .then(() =>
   res.status(200).json({ error: false, message: "Note Deleted Successfully!" })
  )
  .catch((err) => {
   console.log(err);

   return res.status(500).json({
    error: true,
    message: "Server Side Error",
   });
  });
});

app.put("/isPinned/:id", authenticationToken, async (req, res) => {
 const { user } = req.user;
 const noteId = req.params.id;

 try {
  const note = await Note.findOne({ _id: noteId, userId: user._id });

  if (!note) {
   return res.status(404).json({
    error: true,
    message: "Note not found!",
   });
  }

  note.isPinned = !note.isPinned;

  const updatedNote = await note.save();

  return res.status(200).json({
   error: false,
   message: "Note pin status updated successfully",
   note: updatedNote,
  });
 } catch (error) {
  console.error(error);
  return res.status(500).json({
   error: true,
   message: "Internal Server Error!",
  });
 }
});

app.listen(process.env.PORT || 8000 , () => {
 console.log(`Server is running at http://localhost:${process.env.PORT || 8000}/`);
});

module.exports = app;
