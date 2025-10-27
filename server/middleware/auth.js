const jwt = require('jsonwebtoken')

function getTokenFromHeader(req) {
  const h = req.headers['authorization'] || ''
  const parts = h.split(' ')
  if (parts.length === 2 && parts[0] === 'Bearer') return parts[1]
  return null
}

function requireAuth(req, res, next) {
  const token = getTokenFromHeader(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = { id: decoded.id, role: decoded.role }
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Middleware to check if user is approved
async function requireApprovedUser(req, res, next) {
  const token = getTokenFromHeader(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const User = require('../models/User')
    const user = await User.findById(decoded.id)
    if (!user) return res.status(401).json({ error: 'User not found' })
    if (!user.approved) return res.status(403).json({ error: 'Account pending approval' })
    req.user = { id: decoded.id, role: decoded.role }
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, function () {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    next()
  })
}

module.exports = { requireAuth, requireAdmin, requireApprovedUser }
