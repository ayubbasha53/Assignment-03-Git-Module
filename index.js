const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const connectToDatabase = require("./db");
const User = require("./models/User");
const Post = require("./models/Post");
const app = express();
const PORT = 3000;
app.use(bodyParser.json());

const authenticateUser = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }
  jwt.verify(token, "secret_key", (err, decoded) => {
    if (err) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }
    req.userId = decoded.id;
    next();
  });
};

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ status: "success", data: user });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
});
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ status: "error", message: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id }, "secret_key");
    res.status(200).json({ status: "success", token });
  } catch (error) {
    res.status(400).json({ status: "error", message: "Login failed" });
  }
});

app.get("/posts", async (req, res) => {
  try {
    const posts = await Post.find().populate("user", "name");
    res.status(200).json({ posts });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to fetch posts" });
  }
});
app.post("/posts", authenticateUser, async (req, res) => {
  try {
    const { title, body, image } = req.body;
    const user = req.userId;
    const post = new Post({ title, body, image, user });
    await post.save();
    res.status(201).json({ status: "post created", post });
  } catch (error) {
    res.status(400).json({ status: "error", message: "Failed to create post" });
  }
});
app.put("/posts/:postId", authenticateUser, async (req, res) => {
  try {
    const { title, body, image } = req.body;
    const postId = req.params.postId;
    const post = await Post.findByIdAndUpdate(
      postId,
      { title, body, image },
      { new: true }
    );

    res.status(200).json(post);
  } catch (error) {
    res.status(400).json({ status: "error", message: "Failed to update post" });
  }
});
app.delete("/posts/:postId", authenticateUser, async (req, res) => {
  try {
    const postId = req.params.postId;
    await Post.findByIdAndDelete(postId);
    res
      .status(200)
      .json({ status: "success", message: "Post deleted successfully" });
  } catch (error) {
    res.status(400).json({ status: "error", message: "Failed to delete post" });
  }
});
connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to the database:", error.message);
  });
