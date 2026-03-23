const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, token });
  }

  return res.status(401).json({ success: false, message: 'Invalid password' });
});

// Middleware to verify token for protected routes
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(403).json({ success: false, message: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    req.user = decoded;
    next();
  });
};

module.exports = { router, verifyToken };
