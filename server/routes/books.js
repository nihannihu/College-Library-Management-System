const express = require('express')
const Book = require('../models/Book')
const { requireAdmin } = require('../middleware/auth')

const router = express.Router()

router.get('/', async (req, res) => {
  const books = await Book.find({}).sort({ createdAt: -1 })
  return res.json(books)
})

router.get('/:isbn', async (req, res) => {
  const book = await Book.findOne({ isbn: req.params.isbn })
  if (!book) return res.status(404).json({ error: 'Not found' })
  return res.json(book)
})

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, author, isbn, genre, description, coverImage } = req.body
    if (!title || !author || !isbn) return res.status(400).json({ error: 'Missing fields' })
    const exists = await Book.findOne({ isbn })
    if (exists) return res.status(400).json({ error: 'ISBN already exists' })
    const book = await Book.create({ title, author, isbn, genre, description, coverImage })
    return res.json(book)
  } catch (e) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const updated = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!updated) return res.status(404).json({ error: 'Not found' })
    return res.json(updated)
  } catch (e) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await Book.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Not found' })
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
