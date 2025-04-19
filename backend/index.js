const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcrypt');
require('dotenv').config();

const EMAIL = process.env.EMAIL_USER; 
const PASSWORD = process.env.EMAIL_PASS; 
const transporter = nodemailer.createTransport({
  // service: "Gmail", // Use your email provider
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  service: 'gmail',
  auth: {
    user: EMAIL,    // Replace with your email
    pass: PASSWORD, // Replace with your app password
  },
});

function generateOtp(length = 6) {
  return crypto.randomInt(0, 10 ** length).toString().padStart(length, '0');
}

const otpStore = new Map();

function storeOtp(email, otp) {
  otpStore.set(email, { otp, expiresAt: Date.now() + 5 * 60 * 1000 }); // expires in 5 min
}

function getOtp(email) {
  const entry = otpStore.get(email);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(email); // cleanup expired OTP
    return null;
  }
  return entry.otp;
}

function deleteOtp(email) {
  otpStore.delete(email);
}

async function sendOtpEmail(email, otp) {
  const info = await transporter.sendMail({
    from: EMAIL,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is: ${otp}`,
    html: `<p>Your OTP code is: <strong>${otp}</strong></p>`
  });
  // Send the email
  await transporter.sendMail(info);
  console.log("Email sent!")
}

const app = express();
app.use(cors());
app.use(express.json());


app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    const otp = generateOtp();
    storeOtp(email, otp);

    await sendOtpEmail(email, otp);

    res.status(200).json({ message: 'OTP sent to your email.' });

  } catch (err) {
    console.error('❌ Failed to send OTP:', err);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }

});

app.post('/register', async (req, res) => {
  const { username, email, password, otp } = req.body;

  if (!username || !email || !password || !otp) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const storedOtp = await getOtp(email);
    if (!storedOtp) {
      return res.status(400).json({ message: 'OTP expired or not found.' });
    }

    if (storedOtp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    await deleteOtp(email);

    console.log(`✅ Registered user: ${username}, ${email}`);
    res.status(200).json({ message: 'Registration successful!' });

  } catch (err) {
    console.error('❌ Error in registration:', err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Optional: generate token
    // const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful' /*, token*/ });

  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('🟢 MongoDB connected');
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
})
.catch(err => {
  console.error('🔴 MongoDB connection error:', err);
});