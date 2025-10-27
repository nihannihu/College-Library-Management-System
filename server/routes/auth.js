const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body
    if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' })
    const exists = await User.findOne({ email })
    if (exists) return res.status(400).json({ error: 'Email already in use' })
    const hash = await bcrypt.hash(password, 10)
    const user = await User.create({ username, email, password: hash, role: 'member', approved: false })
    return res.json({ id: user._id, message: 'Registration successful. Waiting for admin approval.' })
  } catch (e) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' })
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ error: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' })
    
    // Check if user is approved
    if (!user.approved) return res.status(403).json({ error: 'Account pending approval' })
    
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
    return res.json({ token, role: user.role, username: user.username })
  } catch (e) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  return res.json({ id: req.user.id, role: req.user.role })
})

module.exports = router
