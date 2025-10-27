require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('./models/Book');

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Get all books
    const books = await Book.find({}).select('title isbn coverImage');
    
    console.log(`Found ${books.length} books:`);
    books.forEach((book, index) => {
      console.log(`${index + 1}. ${book.title} (ISBN: ${book.isbn})`);
      console.log(`   Image URL: ${book.coverImage}`);
      console.log('');
    });
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });