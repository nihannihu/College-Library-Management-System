const express = require('express')
const Book = require('../models/Book')
const User = require('../models/User')
const BorrowRequest = require('../models/BorrowRequest')
const { requireAdmin } = require('../middleware/auth')

const router = express.Router()

router.post('/issue', requireAdmin, async (req, res) => {
  try {
    const { bookIsbn, memberEmail } = req.body
    if (!bookIsbn || !memberEmail) return res.status(400).json({ error: 'Missing fields' })
    const user = await User.findOne({ email: memberEmail })
    if (!user) return res.status(404).json({ error: 'Member not found' })
    const book = await Book.findOne({ isbn: bookIsbn })
    if (!book) return res.status(404).json({ error: 'Book not found' })
    if (book.status !== 'Available') return res.status(400).json({ error: 'Book not available' })
    const due = new Date()
    due.setDate(due.getDate() + 14)
    book.status = 'Borrowed'
    book.borrowedBy = user._id
    book.dueDate = due
    await book.save()
    return res.json({ ok: true, dueDate: book.dueDate })
  } catch (e) {
    return res.status(500).json({ error: 'Server error' })
  }
})

// List pending user registrations
router.get('/pending-users', requireAdmin, async (req, res) => {
  const users = await User.find({ approved: false, role: 'member' }).sort({ createdAt: -1 })
  return res.json(users)
})

// Approve user registration
router.post('/approve-user/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.approved) return res.status(400).json({ error: 'User already approved' })
    user.approved = true
    await user.save()
    return res.json({ ok: true, message: 'User approved' })
  } catch (e) {
    return res.status(500).json({ error: 'Server error' })
  }
})

// Reject user registration
router.post('/reject-user/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    await User.deleteOne({ _id: user._id })
    return res.json({ ok: true, message: 'User registration rejected' })
  } catch (e) {
    console.error('Error rejecting user:', e)
    return res.status(500).json({ error: 'Server error: ' + e.message })
  }
})

// List pending borrow requests
router.get('/requests', requireAdmin, async (req, res) => {
  const list = await BorrowRequest.find({ status: 'pending' }).populate('user').sort({ createdAt: -1 })
  return res.json(list)
})

// Approve a borrow request (issues the book to the requesting user)
router.post('/requests/:id/approve', requireAdmin, async (req, res) => {
  try {
    const reqDoc = await BorrowRequest.findById(req.params.id).populate('user')
    if (!reqDoc || reqDoc.status !== 'pending') return res.status(404).json({ error: 'Request not found' })
    const user = reqDoc.user
    const book = await Book.findOne({ isbn: reqDoc.bookIsbn })
    if (!book) return res.status(404).json({ error: 'Book not found' })
    if (book.status !== 'Available') return res.status(400).json({ error: 'Book not available' })
    const due = new Date(); due.setDate(due.getDate() + 14)
    book.status = 'Borrowed'; book.borrowedBy = user._id; book.dueDate = due
    await book.save()
    reqDoc.status = 'approved'; await reqDoc.save()
    return res.json({ ok: true, dueDate: book.dueDate })
  } catch (e) {
    return res.status(500).json({ error: 'Server error' })
  }
})

// Reject a borrow request
router.post('/requests/:id/reject', requireAdmin, async (req, res) => {
  try {
    const reqDoc = await BorrowRequest.findById(req.params.id)
    if (!reqDoc || reqDoc.status !== 'pending') return res.status(404).json({ error: 'Request not found' })
    reqDoc.status = 'rejected'
    await reqDoc.save()
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: 'Server error' })
  }
})

// Testing utility: force a book's due date to N hours from now
router.post('/force-due-soon', requireAdmin, async (req, res) => {
  try {
    const { bookIsbn, hours } = req.body
    if (!bookIsbn) return res.status(400).json({ error: 'Missing bookIsbn' })
    const book = await Book.findOne({ isbn: bookIsbn })
    if (!book) return res.status(404).json({ error: 'Book not found' })
    const h = Number(hours || 1)
    const due = new Date(Date.now() + h * 60 * 60 * 1000)
    book.dueDate = due
    if (book.status !== 'Borrowed') book.status = 'Borrowed'
    await book.save()
    return res.json({ ok: true, dueDate: book.dueDate })
  } catch (e) {
    return res.status(500).json({ error: 'Server error' })
  }
})

// Return a book
router.post('/return', requireAdmin, async (req, res) => {
  try {
    const { bookIsbn } = req.body
    if (!bookIsbn) return res.status(400).json({ error: 'Missing fields' })
    const book = await Book.findOne({ isbn: bookIsbn })
    if (!book) return res.status(404).json({ error: 'Book not found' })
    if (book.status !== 'Borrowed') return res.status(400).json({ error: 'Book is not borrowed' })
    const wasLate = book.dueDate && new Date() > book.dueDate
    book.status = 'Available'
    book.borrowedBy = null
    book.dueDate = null
    await book.save()
    return res.json({ ok: true, late: !!wasLate })
  } catch (e) {
    return res.status(500).json({ error: 'Server error' })
  }
})

// List all borrowed with member info
router.get('/borrowed', requireAdmin, async (req, res) => {
  const books = await Book.find({ status: 'Borrowed' }).populate('borrowedBy', 'username email')
  return res.json(books)
})

// Update due date for a borrowed book
router.post('/borrowed/:isbn/due-date', requireAdmin, async (req, res) => {
  try {
    const { isbn } = req.params
    const { dueDate } = req.body
    if (!dueDate) return res.status(400).json({ error: 'Missing dueDate' })
    
    // Parse the date - handle both ISO string and other formats
    const d = new Date(dueDate)
    if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid dueDate format' })
    
    const book = await Book.findOne({ isbn })
    if (!book) return res.status(404).json({ error: 'Book not found' })
    if (book.status !== 'Borrowed') return res.status(400).json({ error: 'Book is not borrowed' })
    
    const oldDueDate = book.dueDate
    book.dueDate = d
    await book.save()
    
    // Send notification email to user about due date change
    if (book.borrowedBy) {
      const User = require('../models/User')
      const user = await User.findById(book.borrowedBy)
      if (user && user.email) {
        // Access the mailer from the global server context
        const mailer = require('../server').mailer
        const msg = {
          from: process.env.SMTP_FROM || 'no-reply@lms.local',
          to: user.email,
          subject: `Due Date Updated for '${book.title}'`,
          text: `Hello ${user.username},

Your due date for '${book.title}' has been updated from ${oldDueDate ? oldDueDate.toDateString() : 'N/A'} to ${d.toDateString()}.

Please make sure to return the book by the new due date.

Thank you,
Library Management System`
        }
        try {
          await mailer.sendMail(msg)
          console.log(`Due date change notification sent to ${user.email}`)
        } catch (emailErr) {
          console.error('Failed to send due date change notification:', emailErr.message)
        }
      }
    }
    
    return res.json({ ok: true, dueDate: book.dueDate })
  } catch (e) {
    console.error('Error updating due date:', e)
    return res.status(500).json({ error: 'Server error: ' + e.message })
  }
})

// Seed many books with images and categories
router.post('/seed-books', requireAdmin, async (req, res) => {
  try {
    // Replace the placeholder image URLs below with your personal image URLs
    const samples = [
      { title: 'The Silent Sea', author: 'L. Carter', genre: 'Sci-Fi', isbn: '9780000001001', coverImage: 'https://tse4.mm.bing.net/th/id/OIP.pjXM6Lnsfk4oMrkGatT-MwHaLc?rs=1&pid=ImgDetMain&o=7&rm=3', description: 'A voyage across an unforgiving void to find a new home.' },
      { title: 'Gardens of Dawn', author: 'M. Singh', genre: 'Romance', isbn: '9780000001002', coverImage: 'https://i.pinimg.com/originals/20/b4/22/20b4223ae7fe3d837dec52d5a5457f0e.jpg', description: 'Love blooms with the first light over the valley.' },
      { title: 'Codebreakers', author: 'A. Rivera', genre: 'Tech', isbn: '9780000001003', coverImage: 'https://pbs.twimg.com/media/Fr09XYyWIAAqjTp.jpg', description: 'A gripping tale of hackers, ciphers, and global stakes.' },
      { title: 'The Last Kingdom', author: 'J. Warren', genre: 'Fantasy', isbn: '9780000001004', coverImage: 'https://i.pinimg.com/474x/76/ad/55/76ad5505aa9bdc8ff3ae2bcb349d599f--good-books-pop-up-books.jpg', description: 'An heir fights destiny to reclaim a fractured throne.' },
      { title: 'Deep Blue', author: 'R. Okoye', genre: 'Thriller', isbn: '9780000001005', coverImage: 'https://m.media-amazon.com/images/I/51Fnn+a0zkL._SY445_SX342_.jpg', description: 'A submarine chase beneath the polar ice.' },
      { title: 'Quantum Garden', author: 'E. Petrov', genre: 'Sci-Fi', isbn: '9780000001006', coverImage: 'https://m.media-amazon.com/images/I/81KQ0-xGDvL._SL1500_.jpg', description: 'Where physics bends, realities bloom.' },
      { title: 'Midnight Library', author: 'T. Huang', genre: 'Literary', isbn: '9780000001007', coverImage: 'https://i.pinimg.com/736x/7a/b4/b3/7ab4b3115c0db30b3126827e2b662fe2.jpg', description: 'Between pages and choices, a life rewritten.' },
      { title: 'Data Dreams', author: 'K. Ahmed', genre: 'Tech', isbn: '9780000001008', coverImage: 'https://static.wixstatic.com/media/f5e25b_3c8cddd909e94f6ba57eb02f70039c4a~mv2.png/v1/fill/w_980,h_551,al_c,q_90,usm_0.66_1.00_0.01,enc_auto/f5e25b_3c8cddd909e94f6ba57eb02f70039c4a~mv2.png', description: 'Building intelligent systems that feel almost human.' },
      { title: 'Echoes of War', author: 'S. Novak', genre: 'History', isbn: '9780000001009', coverImage: 'https://tse4.mm.bing.net/th/id/OIP.mVIy8XrtVvMwEmxTqgTvvwHaJh?rs=1&pid=ImgDetMain&o=7&rm=3', description: 'From letters at the front to the home they left behind.' },
      { title: 'Moonlit Paths', author: 'Y. Tanaka', genre: 'Poetry', isbn: '9780000001010', coverImage: 'https://i.pinimg.com/736x/fa/d9/61/fad961ae59fcdd5499a32785d27923e6.jpg', description: 'Verses woven from night and wanderers.' }
    ]
    const ops = []
    for (const s of samples) {
      const exists = await Book.findOne({ isbn: s.isbn })
      if (!exists) ops.push(Book.create(s))
    }
    const created = await Promise.all(ops)
    return res.json({ created: created.length, total: await Book.countDocuments() })
  } catch (e) {
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
