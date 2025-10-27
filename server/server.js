require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const path = require('path')
const cron = require('node-cron')
const nodemailer = require('nodemailer')

const authRoutes = require('./routes/auth')
const bookRoutes = require('./routes/books')
const adminRoutes = require('./routes/admin')
const memberRoutes = require('./routes/member')
const bcrypt = require('bcryptjs')
const User = require('./models/User')

const app = express()
app.use(cors())
app.use(express.json())

// Serve client (static frontend)
const clientDir = path.join(__dirname, '..', 'client')
app.use(express.static(clientDir))

// Disable caching for HTML to avoid stale pages from previous apps
app.use((req, res, next) => {
  const accept = req.headers['accept'] || ''
  if (req.method === 'GET' && accept.includes('text/html')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.setHeader('Surrogate-Control', 'no-store')
    res.setHeader('Clear-Site-Data', '"cache", "storage"')
  }
  next()
})

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI
if (!mongoUri) {
  console.error('MONGO_URI is not set')
  process.exit(1)
}

mongoose
  .connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('MongoDB connected')
    // Seed admin user if env provided
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD
    const adminUsername = process.env.ADMIN_USERNAME || 'admin'
    if (adminEmail && adminPassword) {
      const existing = await User.findOne({ email: adminEmail })
      const hash = await bcrypt.hash(adminPassword, 10)
      if (!existing) {
        await User.create({ username: adminUsername, email: adminEmail, password: hash, role: 'admin', approved: true })
        console.log(`Seeded admin user: ${adminEmail}`)
      } else {
        existing.role = 'admin'
        existing.username = adminUsername
        existing.password = hash
        existing.approved = true
        await existing.save()
        console.log(`Updated existing admin user credentials: ${adminEmail}`)
      }
    }
  })
  .catch((err) => {
    console.error('MongoDB connection error', err)
    process.exit(1)
  })

// Health check
app.get('/health', (req, res) => res.json({ ok: true }))

app.use('/api/auth', authRoutes)
app.use('/api/books', bookRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/member', memberRoutes)

// Fallback: serve index.html for non-API routes (keeps /api/* intact)
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'))
})

// Configure mail transport (fallback to dev console transport if SMTP not set)
function createMailTransport() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
  }
  return nodemailer.createTransport({ jsonTransport: true })
}

const mailer = createMailTransport()

// Export mailer for use in other modules
module.exports.mailer = mailer

async function sendDueSoonNotices() {
  const Book = require('./models/Book')
  const User = require('./models/User')
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const dueSoon = await Book.find({ status: 'Borrowed', dueDate: { $gte: now, $lte: in24h } }).populate('borrowedBy')
  for (const b of dueSoon) {
    const user = b.borrowedBy
    if (!user || !user.email) continue
    const msg = {
      from: process.env.SMTP_FROM || 'no-reply@lms.local',
      to: user.email,
      subject: `Reminder: '${b.title}' is due soon`,
      text: `Hello ${user.username},\n\nYour borrowed book '${b.title}' is due on ${b.dueDate.toDateString()}. Please return it on time.`,
    }
    try { await mailer.sendMail(msg) } catch (e) { console.error('Email send error', e.message) }
  }
  return dueSoon.length
}

// Cron: run every day at 09:00
cron.schedule('0 9 * * *', async () => {
  try {
    const count = await sendDueSoonNotices()
    if (count) console.log(`Due notices sent: ${count}`)
  } catch (e) {
    console.error('Cron error', e)
  }
})

// Admin trigger to send due notices now
app.post('/api/admin/send-due-notices', async (req, res) => {
  try {
    // simple check: require admin token via existing middleware chain not available here, so call internal guard
    const { requireAdmin } = require('./middleware/auth')
    return requireAdmin(req, res, async () => {
      const count = await sendDueSoonNotices()
      res.json({ sent: count })
    })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Admin: send a direct test email
app.post('/api/admin/send-test-email', async (req, res) => {
  try {
    const { requireAdmin } = require('./middleware/auth')
    return requireAdmin(req, res, async () => {
      const { to, subject, text } = req.body || {}
      if (!to) return res.status(400).json({ error: 'Missing to' })
      const msg = {
        from: process.env.SMTP_FROM || 'no-reply@lms.local',
        to,
        subject: subject || 'LMS Test Email',
        text: text || 'This is a test email from your Library Management System.'
      }
      const info = await mailer.sendMail(msg)
      res.json({ ok: true, info })
    })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Server running on port ${port}`))
