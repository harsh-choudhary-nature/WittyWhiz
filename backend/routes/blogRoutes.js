const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const User = require('../models/User');

router.post('/create', async (req, res) => {
  try {
    const { title, keywords, content, email } = req.body;
    // console.log(`title : ${title}\nkeywords : ${keywords}\ncontent : ${content}\nemail : ${email}`);
    // Validate required fields
    if (!title || !keywords || !content || !email) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const newBlog = new Blog({
      title,
      keywords,
      content,
      email: user.email,
      username: user.username,
      author: user._id,
      likes: 0,
      dislikes: 0,
    });

    await newBlog.save();

    res.status(201).json({ message: 'Blog created successfully.' });
  } catch (err) {
    console.error('Error creating blog:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
