const path = require("node:path");
process.loadEnvFile(path.join(__dirname, ".env"));

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const AppDataSource = require("./db");
const UserSchema = require("./entites/users");
const PostSchema = require("./entites/posts");
const CommentSchema = require("./entites/comments");
const ShareSchema = require("./entites/shares");
const authMiddleware = require("./middleware/auth.middleware");
const requireRole = require("./middleware/requireRole");

const app = express();
app.use(express.json());

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters long")
    .max(80, "Username cannot be longer than 80 characters"),
  email: z
    .string()
    .trim()
    .max(255, "Email cannot be longer than 255 characters")
    .email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

app.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid registration data",
      errors: parsed.error.issues.map(({ path: fieldPath, message }) => ({
        field: fieldPath.join("."),
        message,
      })),
    });
  }

  const { username, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const userRepository = AppDataSource.getRepository(UserSchema);

  try {
    const existingUser = await userRepository.findOne({
      where: [{ email }, { username }],
    });
    if (existingUser) {
      return res.status(409).json({ message: "Username or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = userRepository.create({
      username,
      email,
      password: hashedPassword,
      role: "user",
    });

    await userRepository.save(user);
    return res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(409).json({ message: "Username or email already exists" });
    }
    console.error("[/register] Unhandled error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = body.password;
  const userRepository = AppDataSource.getRepository(UserSchema);

  try {
    const user = await userRepository.findOne({ where: { email } });
    if (!user || typeof user.password !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" },
    );
    return res.json({ token, role: user.role });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/auth", authMiddleware, async (req, res) => {
  try {
    const user = await AppDataSource.getRepository(UserSchema).findOne({
      where: { id: req.user.userId },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

function getId(value) {
  if (!/^[1-9]\d*$/.test(value || "")) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function isUniqueViolation(error) {
  return error?.code === "23505" || error?.driverError?.code === "23505";
}

function userResponse(user) {
  return { id: user.id, username: user.username };
}

function postResponse(post) {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    author: post.user ? userResponse(post.user) : null,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    commentsCount: post.commentsCount ?? 0,
    sharesCount: post.sharesCount ?? 0,
  };
}

function commentResponse(comment) {
  return {
    id: comment.id,
    postId: comment.post.id,
    content: comment.content,
    author: userResponse(comment.user),
    createdAt: comment.createdAt,
  };
}

function shareResponse(share) {
  return {
    id: share.id,
    postId: share.post.id,
    user: userResponse(share.user),
    createdAt: share.createdAt,
  };
}

function postQuery() {
  return AppDataSource.getRepository(PostSchema)
    .createQueryBuilder("post")
    .innerJoinAndSelect("post.user", "author");
}

async function addPostCounts(posts) {
  if (posts.length === 0) return posts;

  const postIds = posts.map((post) => post.id);
  const [commentCounts, shareCounts] = await Promise.all([
    AppDataSource.query(
      'SELECT "postId", COUNT(*)::int AS count FROM comments WHERE "postId" = ANY($1::int[]) GROUP BY "postId"',
      [postIds],
    ),
    AppDataSource.query(
      'SELECT "postId", COUNT(*)::int AS count FROM shares WHERE "postId" = ANY($1::int[]) GROUP BY "postId"',
      [postIds],
    ),
  ]);
  const countsByPost = (rows) => new Map(
    rows.map((row) => [Number(row.postId), Number(row.count)]),
  );
  const commentsByPost = countsByPost(commentCounts);
  const sharesByPost = countsByPost(shareCounts);

  return posts.map((post) => ({
    ...post,
    commentsCount: commentsByPost.get(post.id) ?? 0,
    sharesCount: sharesByPost.get(post.id) ?? 0,
  }));
}

app.post("/posts", authMiddleware, requireRole("user"), async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  if (typeof body.title !== "string" || !body.title.trim()) {
    return res.status(400).json({ message: "Title is required" });
  }
  if (body.title.trim().length > 200) {
    return res.status(400).json({ message: "Title cannot be longer than 200 characters" });
  }
  if (typeof body.content !== "string" || !body.content.trim()) {
    return res.status(400).json({ message: "Content is required" });
  }

  try {
    const post = AppDataSource.getRepository(PostSchema).create({
      title: body.title.trim(),
      content: body.content.trim(),
      user: { id: req.user.userId },
    });
    await AppDataSource.getRepository(PostSchema).save(post);
    const savedPost = (await addPostCounts([
      await postQuery().where("post.id = :id", { id: post.id }).getOne(),
    ]))[0];
    return res.status(201).json({
      message: "Post created successfully",
      post: postResponse(savedPost),
    });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/posts", authMiddleware, requireRole("user", "admin"), async (req, res) => {
  const rawSearch = req.query.q ?? req.query.search;
  if (rawSearch !== undefined && typeof rawSearch !== "string") {
    return res.status(400).json({ message: "Search query must be a string" });
  }
  const search = rawSearch?.trim();
  if (rawSearch !== undefined && !search) {
    return res.status(400).json({ message: "Search query cannot be empty" });
  }

  try {
    const query = postQuery().orderBy("post.createdAt", "DESC");
    if (search) {
      query.andWhere(
        "(post.title ILIKE :search OR post.content ILIKE :search)",
        { search: `%${search}%` },
      );
    }
    const posts = await query.getMany();
    return res.json((await addPostCounts(posts)).map(postResponse));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/posts/:id", authMiddleware, requireRole("user", "admin"), async (req, res) => {
  const id = getId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "Invalid post id" });
  }

  try {
    const post = await postQuery().where("post.id = :id", { id }).getOne();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    return res.json(postResponse((await addPostCounts([post]))[0]));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

async function updatePost(req, res) {
  const id = getId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "Invalid post id" });
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
  if (hasTitle && body.title.trim().length > 200) {
    return res.status(400).json({ message: "Title cannot be longer than 200 characters" });
  }
  if (hasContent && (typeof body.content !== "string" || !body.content.trim())) {
    return res.status(400).json({ message: "Content cannot be empty" });
  }

  try {
    const post = await AppDataSource.getRepository(PostSchema).findOne({
      where: { id, user: { id: req.user.userId } },
      relations: { user: true },
    });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (hasTitle) post.title = body.title.trim();
    if (hasContent) post.content = body.content.trim();
    await AppDataSource.getRepository(PostSchema).save(post);
    const updatedPost = (await addPostCounts([
      await postQuery().where("post.id = :id", { id }).getOne(),
    ]))[0];
    return res.json({
      message: "Post updated successfully",
      post: postResponse(updatedPost),
    });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

app.put("/posts/:id", authMiddleware, requireRole("user"), updatePost);
app.patch("/posts/:id", authMiddleware, requireRole("user"), updatePost);

app.delete("/posts/:id", authMiddleware, requireRole("user"), async (req, res) => {
  const id = getId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "Invalid post id" });
  }

  try {
    const result = await AppDataSource.getRepository(PostSchema).delete({
      id,
      user: { id: req.user.userId },
    });
    if (result.affected === 0) {
      return res.status(404).json({ message: "Post not found" });
    }
    return res.json({ message: "Post deleted successfully" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

app.delete("/admin/posts/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  const id = getId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "Invalid post id" });
  }

  try {
    const result = await AppDataSource.getRepository(PostSchema).delete({ id });
    if (result.affected === 0) {
      return res.status(404).json({ message: "Post not found" });
    }
    return res.json({ message: "Post deleted successfully" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/admin/users", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const users = await AppDataSource.getRepository(UserSchema)
      .createQueryBuilder("user")
      .select(["user.id", "user.username", "user.email", "user.role"])
      .orderBy("user.id", "ASC")
      .getMany();
    return res.json(users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    })));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

app.delete("/admin/users/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  const id = getId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  try {
    const deleted = await AppDataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(UserSchema);
      const user = await userRepository.findOne({ where: { id } });
      if (!user) return false;
      await userRepository.remove(user);
      return true;
    });

    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ message: "User and their posts, comments, and shares deleted successfully" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

app.post(
  "/posts/:id/comments",
  authMiddleware,
  requireRole("user", "admin"),
  async (req, res) => {
    const postId = getId(req.params.id);
    if (postId === null) {
      return res.status(400).json({ message: "Invalid post id" });
    }
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (typeof body.content !== "string" || !body.content.trim()) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    try {
      const post = await AppDataSource.getRepository(PostSchema).findOne({ where: { id: postId } });
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      const comment = AppDataSource.getRepository(CommentSchema).create({
        content: body.content.trim(),
        post: { id: postId },
        user: { id: req.user.userId },
      });
      await AppDataSource.getRepository(CommentSchema).save(comment);
      const savedComment = await AppDataSource.getRepository(CommentSchema).findOne({
        where: { id: comment.id },
        relations: { post: true, user: true },
      });
      return res.status(201).json({
        message: "Comment created successfully",
        comment: commentResponse(savedComment),
      });
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  },
);

app.get(
  "/posts/:id/comments",
  authMiddleware,
  requireRole("user", "admin"),
  async (req, res) => {
    const postId = getId(req.params.id);
    if (postId === null) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    try {
      const post = await AppDataSource.getRepository(PostSchema).findOne({ where: { id: postId } });
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      const comments = await AppDataSource.getRepository(CommentSchema).find({
        where: { post: { id: postId } },
        relations: { post: true, user: true },
        order: { createdAt: "ASC" },
      });
      return res.json(comments.map(commentResponse));
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  },
);

app.delete("/comments/:id", authMiddleware, requireRole("user", "admin"), async (req, res) => {
  const id = getId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  try {
    const comment = await AppDataSource.getRepository(CommentSchema).findOne({
      where: { id },
      relations: { user: true, post: { user: true } },
    });
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const isCommentAuthor = comment.user.id === req.user.userId;
    const isPostAuthor = comment.post.user.id === req.user.userId;
    if (!isCommentAuthor && !isPostAuthor && req.user.role !== "admin") {
      return res.status(403).json({ message: "You cannot delete this comment" });
    }

    await AppDataSource.getRepository(CommentSchema).remove(comment);
    return res.json({ message: "Comment deleted successfully" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

app.post(
  "/posts/:id/share",
  authMiddleware,
  requireRole("user", "admin"),
  async (req, res) => {
    const postId = getId(req.params.id);
    if (postId === null) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    try {
      const post = await AppDataSource.getRepository(PostSchema).findOne({ where: { id: postId } });
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      const shareRepository = AppDataSource.getRepository(ShareSchema);
      const existingShare = await shareRepository.findOne({
        where: { post: { id: postId }, user: { id: req.user.userId } },
      });
      if (existingShare) {
        return res.status(409).json({ message: "You have already shared this post" });
      }

      const share = shareRepository.create({
        post: { id: postId },
        user: { id: req.user.userId },
      });
      await shareRepository.save(share);
      const savedShare = await shareRepository.findOne({
        where: { id: share.id },
        relations: { post: true, user: true },
      });
      return res.status(201).json({
        message: "Post shared successfully",
        share: shareResponse(savedShare),
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(409).json({ message: "You have already shared this post" });
      }
      return res.status(500).json({ message: "Server error" });
    }
  },
);

app.get(
  "/posts/:id/shares",
  authMiddleware,
  requireRole("user", "admin"),
  async (req, res) => {
    const postId = getId(req.params.id);
    if (postId === null) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    try {
      const post = await AppDataSource.getRepository(PostSchema).findOne({ where: { id: postId } });
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      const shares = await AppDataSource.getRepository(ShareSchema).find({
        where: { post: { id: postId } },
        relations: { post: true, user: true },
        order: { createdAt: "ASC" },
      });
      return res.json(shares.map(shareResponse));
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  },
);

app.delete(
  "/posts/:id/share",
  authMiddleware,
  requireRole("user", "admin"),
  async (req, res) => {
    const postId = getId(req.params.id);
    if (postId === null) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    try {
      const result = await AppDataSource.getRepository(ShareSchema).delete({
        post: { id: postId },
        user: { id: req.user.userId },
      });
      if (result.affected === 0) {
        return res.status(404).json({ message: "Share not found" });
      }
      return res.json({ message: "Share removed successfully" });
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  },
);

const PORT = Number(process.env.PORT || 5000);

async function configureBootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) return;

  const result = await AppDataSource.getRepository(UserSchema).update(
    { email },
    { role: "admin" },
  );
  if (result.affected === 0) {
    console.warn("ADMIN_EMAIL does not match a registered user; no admin was promoted");
  }
}

async function startServer() {
  try {
    await AppDataSource.initialize();
    console.log("Database connected successfully");
    await configureBootstrapAdmin();

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
