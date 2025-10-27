const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['member', 'admin'], default: 'member' },
    lastGenre: { type: String, default: null },
    approved: { type: Boolean, default: false } // New field for approval status
  },
  { timestamps: true }
)

module.exports = mongoose.model('User', UserSchema)
