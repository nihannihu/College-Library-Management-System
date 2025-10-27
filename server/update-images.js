require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('./models/Book');

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Define the updated book images
    const bookUpdates = [
      { isbn: '9780000001001', coverImage: 'https://tse4.mm.bing.net/th/id/OIP.pjXM6Lnsfk4oMrkGatT-MwHaLc?rs=1&pid=ImgDetMain&o=7&rm=3' },
      { isbn: '9780000001002', coverImage: 'https://i.pinimg.com/originals/20/b4/22/20b4223ae7fe3d837dec52d5a5457f0e.jpg' },
      { isbn: '9780000001003', coverImage: 'https://pbs.twimg.com/media/Fr09XYyWIAAqjTp.jpg' },
      { isbn: '9780000001004', coverImage: 'https://i.pinimg.com/474x/76/ad/55/76ad5505aa9bdc8ff3ae2bcb349d599f--good-books-pop-up-books.jpg' },
      { isbn: '9780000001005', coverImage: 'https://m.media-amazon.com/images/I/51Fnn+a0zkL._SY445_SX342_.jpg' },
      { isbn: '9780000001006', coverImage: 'https://m.media-amazon.com/images/I/81KQ0-xGDvL._SL1500_.jpg' },
      { isbn: '9780000001007', coverImage: 'https://i.pinimg.com/736x/7a/b4/b3/7ab4b3115c0db30b3126827e2b662fe2.jpg' },
      { isbn: '9780000001008', coverImage: 'https://static.wixstatic.com/media/f5e25b_3c8cddd909e94f6ba57eb02f70039c4a~mv2.png/v1/fill/w_980,h_551,al_c,q_90,usm_0.66_1.00_0.01,enc_auto/f5e25b_3c8cddd909e94f6ba57eb02f70039c4a~mv2.png' },
      { isbn: '9780000001009', coverImage: 'https://tse4.mm.bing.net/th/id/OIP.mVIy8XrtVvMwEmxTqgTvvwHaJh?rs=1&pid=ImgDetMain&o=7&rm=3' },
      { isbn: '9780000001010', coverImage: 'https://i.pinimg.com/736x/fa/d9/61/fad961ae59fcdd5499a32785d27923e6.jpg' }
    ];
    
    // Update each book
    let updatedCount = 0;
    for (const update of bookUpdates) {
      try {
        const result = await Book.updateOne(
          { isbn: update.isbn },
          { $set: { coverImage: update.coverImage } }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`Updated image for book with ISBN ${update.isbn}`);
          updatedCount++;
        } else {
          console.log(`No changes made for ISBN ${update.isbn} (may not exist)`);
        }
      } catch (error) {
        console.error(`Error updating book ${update.isbn}:`, error.message);
      }
    }
    
    console.log(`\nSuccessfully updated ${updatedCount} book images!`);
    console.log('Restart your server to see the changes on your website.');
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });