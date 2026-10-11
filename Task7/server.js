require("node:process").loadEnvFile();

const path = require("node:path");
process.loadEnvFile(path.join(__dirname, ".env"));
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { ILike } = require("typeorm");
const AppDataSource = require("./db");
const UserSchema = require("./entites/users");
const NoteSchema = require("./entites/notes");
const authMiddleware = require("./middleware/auth.middleware");

const app = express();
app.use(express.json());

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  const userRepository = AppDataSource.getRepository(UserSchema);

  try {
    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.trim();
    const existingUser = await userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newuser = userRepository.create({
      username,
      email: normalizedEmail,
      password: hashedPassword,
    });

    await userRepository.save(newuser);
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const userRepository = AppDataSource.getRepository(UserSchema);

  try {
    const user = await userRepository.findOne({ where: { email } });

    // Legacy records can have no password until the account is re-created
    // or a password reset flow is provided.
    if (!user || typeof user.password !== "string") {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

app.get("/auth", authMiddleware, async (req, res) => {
  const userRepository = AppDataSource.getRepository(UserSchema);

  try {
    const user = await userRepository.findOne({
      where: { id: req.user.userId },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ id: user.id, username: user.username, email: user.email });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

app.post("/notes", authMiddleware, async (req, res) => {
  const { title, content } = req.body ?? {};
  const noteRepository = AppDataSource.getRepository(NoteSchema);
  const userRepository = AppDataSource.getRepository(UserSchema);

  try {
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (typeof content !== "string") {
      return res.status(400).json({ message: "Content is required" });
    }

    const user = await userRepository.findOne({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newNote = noteRepository.create({ title: title.trim(), content, user });
    await noteRepository.save(newNote);
    res.status(201).json({
      message: "Note created successfully",
      note: { id: newNote.id, title: newNote.title, content: newNote.content },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

function getNoteId(value) {
  if (!/^[1-9]\d*$/.test(value || "")) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function noteResponse(note) {
  return { id: note.id, title: note.title, content: note.content };
}

async function listNotes(req, res) {
  const noteRepository = AppDataSource.getRepository(NoteSchema);
  const userId = req.user.userId;
  const rawSearch = req.query.q ?? req.query.query ?? req.query.search;

  try {
    if (rawSearch !== undefined && typeof rawSearch !== "string") {
      return res.status(400).json({ message: "Search query must be a string" });
    }

    const search = rawSearch?.trim();
    if (rawSearch !== undefined && !search) {
      return res.status(400).json({ message: "Search query cannot be empty" });
    }
    const where = search
      ? [
          { user: { id: userId }, title: ILike(`%${search}%`) },
          { user: { id: userId }, content: ILike(`%${search}%`) },
        ]
      : { user: { id: userId } };

    const notes = await noteRepository.find({ where, order: { id: "ASC" } });
    return res.json(notes.map(noteResponse));
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
}

app.get("/notes", authMiddleware, listNotes);
app.get("/notes/search", authMiddleware, (req, res) => {
  if (
    req.query.q === undefined &&
    req.query.query === undefined &&
    req.query.search === undefined
  ) {
    return res.status(400).json({ message: "Search query is required" });
  }
  return listNotes(req, res);
});

app.get("/notes/:id", authMiddleware, async (req, res) => {
  const id = getNoteId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "Invalid note id" });
  }

  const noteRepository = AppDataSource.getRepository(NoteSchema);
  try {
    const note = await noteRepository.findOne({
      where: { id, user: { id: req.user.userId } },
    });
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }
    return res.json(noteResponse(note));
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

async function updateNote(req, res) {
  const id = getNoteId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "Invalid note id" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const hasTitle = Object.prototype.hasOwnProperty.call(body, "title");
  const hasContent = Object.prototype.hasOwnProperty.call(body, "content");
  if (!hasTitle && !hasContent) {
    return res.status(400).json({ message: "Provide a title or content to update" });
  }
  if (hasTitle && (typeof body.title !== "string" || !body.title.trim())) {
    return res.status(400).json({ message: "Title cannot be empty" });
  }
  if (hasContent && typeof body.content !== "string") {
    return res.status(400).json({ message: "Content must be a string" });
  }

  const noteRepository = AppDataSource.getRepository(NoteSchema);
  try {
    const note = await noteRepository.findOne({
      where: { id, user: { id: req.user.userId } },
    });
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (hasTitle) note.title = body.title.trim();
    if (hasContent) note.content = body.content;
    await noteRepository.save(note);
    return res.json({ message: "Note updated successfully", note: noteResponse(note) });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
}

app.put("/notes/:id", authMiddleware, updateNote);
app.patch("/notes/:id", authMiddleware, updateNote);

app.delete("/notes/:id", authMiddleware, async (req, res) => {
  const id = getNoteId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "Invalid note id" });
  }

  const noteRepository = AppDataSource.getRepository(NoteSchema);
  try {
    const result = await noteRepository.delete({ id, user: { id: req.user.userId } });
    if (result.affected === 0) {
      return res.status(404).json({ message: "Note not found" });
    }
    return res.json({ message: "Note deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    await AppDataSource.initialize();
    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to the database:", error.message);
    process.exitCode = 1;
  }
}

startServer();

module.exports = app;
