require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('./models/Book');

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const samples = [
      { title: 'The Silent Sea', author: 'L. Carter', genre: 'Sci-Fi', isbn: '9780000001001', coverImage: 'https://picsum.photos/seed/sci1/300/420', description: 'A voyage across an unforgiving void to find a new home.' },
      { title: 'Gardens of Dawn', author: 'M. Singh', genre: 'Romance', isbn: '9780000001002', coverImage: 'https://picsum.photos/seed/rom1/300/420', description: 'Love blooms with the first light over the valley.' },
      { title: 'Codebreakers', author: 'A. Rivera', genre: 'Tech', isbn: '9780000001003', coverImage: 'https://picsum.photos/seed/tech1/300/420', description: 'A gripping tale of hackers, ciphers, and global stakes.' },
      { title: 'The Last Kingdom', author: 'J. Warren', genre: 'Fantasy', isbn: '9780000001004', coverImage: 'https://picsum.photos/seed/fan1/300/420', description: 'An heir fights destiny to reclaim a fractured throne.' },
      { title: 'Deep Blue', author: 'R. Okoye', genre: 'Thriller', isbn: '9780000001005', coverImage: 'https://picsum.photos/seed/thr1/300/420', description: 'A submarine chase beneath the polar ice.' }
    ];
    
    const ops = [];
    for (const s of samples) {
      const exists = await Book.findOne({ isbn: s.isbn });
      if (!exists) {
        ops.push(Book.create(s));
        console.log(`Adding book: ${s.title}`);
      } else {
        console.log(`Book already exists: ${s.title}`);
      }
    }
    
    const created = await Promise.all(ops);
    console.log(`Created ${created.length} books`);
    
    // Check total books
    const total = await Book.countDocuments();
    console.log(`Total books in database: ${total}`);
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error:', err);
  });