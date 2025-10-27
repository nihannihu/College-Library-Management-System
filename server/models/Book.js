const mongoose = require('mongoose')

const BookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    isbn: { type: String, unique: true, required: true },
    genre: { type: String },
    description: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    status: { type: String, enum: ['Available', 'Borrowed'], default: 'Available' },
    borrowedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    dueDate: { type: Date, default: null }
  },
  { timestamps: true }
)

module.exports = mongoose.model('Book', BookSchema)
