// Script to update book images with personal URLs
// Replace the image URLs below with your personal image URLs

require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('./models/Book');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Define your book image mappings
    // Format: { isbn: 'BOOK_ISBN', imageUrl: 'YOUR_IMAGE_URL' }
    const bookImageUpdates = [
      { isbn: '9780000001001', imageUrl: 'YOUR_SCI_FI_IMAGE_URL_HERE' },
      { isbn: '9780000001002', imageUrl: 'YOUR_ROMANCE_IMAGE_URL_HERE' },
      { isbn: '9780000001003', imageUrl: 'YOUR_TECH_IMAGE_URL_HERE' },
      { isbn: '9780000001004', imageUrl: 'YOUR_FANTASY_IMAGE_URL_HERE' },
      { isbn: '9780000001005', imageUrl: 'YOUR_THRILLER_IMAGE_URL_HERE' },
      { isbn: '9780000001006', imageUrl: 'YOUR_SCI_FI2_IMAGE_URL_HERE' },
      { isbn: '9780000001007', imageUrl: 'YOUR_LITERARY_IMAGE_URL_HERE' },
      { isbn: '9780000001008', imageUrl: 'YOUR_TECH2_IMAGE_URL_HERE' },
      { isbn: '9780000001009', imageUrl: 'YOUR_HISTORY_IMAGE_URL_HERE' },
      { isbn: '9780000001010', imageUrl: 'YOUR_POETRY_IMAGE_URL_HERE' }
    ];
    
    // Update each book
    for (const update of bookImageUpdates) {
      try {
        const result = await Book.updateOne(
          { isbn: update.isbn },
          { $set: { coverImage: update.imageUrl } }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`Updated book with ISBN ${update.isbn}`);
        } else {
          console.log(`No changes made for ISBN ${update.isbn}`);
        }
      } catch (error) {
        console.error(`Error updating book ${update.isbn}:`, error.message);
      }
    }
    
    console.log('Book image update process completed');
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });