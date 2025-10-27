const express = require('express')
const Book = require('../models/Book')
const { requireAuth, requireApprovedUser } = require('../middleware/auth')
const User = require('../models/User')
const BorrowRequest = require('../models/BorrowRequest')

const router = express.Router()

router.get('/my-books', requireApprovedUser, async (req, res) => {
  const books = await Book.find({ borrowedBy: req.user.id }).sort({ dueDate: 1 })
  return res.json(books)
})

router.post('/borrow', requireApprovedUser, async (req, res) => {
  try {
    const { bookIsbn } = req.body
    if (!bookIsbn) return res.status(400).json({ error: 'Missing bookIsbn' })
    const book = await Book.findOne({ isbn: bookIsbn })
    if (!book) return res.status(404).json({ error: 'Book not found' })
    if (book.status !== 'Available') return res.status(400).json({ error: 'Book not available' })
    const due = new Date()
    due.setDate(due.getDate() + 14)
    book.status = 'Borrowed'
    book.borrowedBy = req.user.id
    book.dueDate = due
    await book.save()
    // update user's lastGenre for recommendations
    if (book.genre) {
      await User.findByIdAndUpdate(req.user.id, { lastGenre: book.genre })
    }
    return res.json({ ok: true, dueDate: book.dueDate })
  } catch (e) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/return', requireApprovedUser, async (req, res) => {
  try {
    const { bookIsbn } = req.body
    if (!bookIsbn) return res.status(400).json({ error: 'Missing bookIsbn' })
    const book = await Book.findOne({ isbn: bookIsbn, borrowedBy: req.user.id })
    if (!book) return res.status(404).json({ error: 'Book not found or not borrowed by you' })
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

router.get('/recommendations', requireApprovedUser, async (req, res) => {
  try {
    const me = await User.findById(req.user.id)
    if (!me || !me.lastGenre) return res.json([])
    const recs = await Book.find({ genre: me.lastGenre, status: 'Available' }).limit(3)
    return res.json(recs)
  } catch (e) {
    return res.status(500).json({ error: 'Server error' })
  }
})

// Get my borrow requests
router.get('/requests', requireApprovedUser, async (req, res) => {
  const list = await BorrowRequest.find({ user: req.user.id, status: 'pending' }).sort({ createdAt: -1 })
  return res.json(list)
})

// Create a borrow request (member asks librarian to issue a book)
router.post('/request-borrow', requireApprovedUser, async (req, res) => {
  try {
    const { bookIsbn } = req.body
    if (!bookIsbn) return res.status(400).json({ error: 'Missing bookIsbn' })
    const existing = await BorrowRequest.findOne({ user: req.user.id, bookIsbn, status: 'pending' })
    if (existing) return res.status(400).json({ error: 'Already requested' })
    const reqDoc = await BorrowRequest.create({ user: req.user.id, bookIsbn })
    return res.json({ ok: true, requestId: reqDoc._id })
  } catch (e) {
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
