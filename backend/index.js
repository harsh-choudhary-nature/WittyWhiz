const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const otpStore = new Map(); // email -> otp

// Simulate sending OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

app.post('/send-otp', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  const otp = generateOtp();
  otpStore.set(email, otp);

  // Simulate sending email
  console.log(`📧 OTP for ${email}: ${otp}`);

  res.status(200).json({ message: 'OTP sent to your email.' });
});

app.post('/register', (req, res) => {
  const { username, email, password, otp } = req.body;

  if (!username || !email || !password || !otp) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const storedOtp = otpStore.get(email);
  if (!storedOtp) {
    return res.status(400).json({ message: 'No OTP sent to this email.' });
  }

  if (storedOtp !== otp) {
    return res.status(400).json({ message: 'Invalid OTP.' });
  }

  // At this point registration is successful
  // You'd usually store the user in DB
  otpStore.delete(email); // Remove OTP after successful use

  console.log(`✅ Registered user: ${username}, ${email}`);
  res.status(200).json({ message: 'Registration successful!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
