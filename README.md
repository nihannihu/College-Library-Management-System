# College Library Management System by Nihan Nihu (nihannihu)

A fast hackathon-ready Library Management System (LMS) developed by Nihan Nihu (GitHub: nihannihu | Instagram: @nihannihuu | LinkedIn: nihan-nihu). This system provides:

- Member portal: view/search books, see borrowed books and due dates.
- Admin dashboard: add books, issue and return books.
- JWT auth, role-based access, MongoDB via Mongoose.

## Find Me Online

- **GitHub**: [nihannihu](https://github.com/nihannihu)
- **Instagram**: [@nihannihuu](https://instagram.com/nihannihuu)
- **LinkedIn**: [nihan-nihu](https://linkedin.com/in/nihan-nihu)

Search for "Nihan Nihu" or "nihannihu" on Google to find all my profiles and projects.

## Project Structure

- server
  - Express API, MongoDB models, routes, middleware
- client
  - Vanilla HTML/CSS/JS pages

## Prerequisites

- Node.js 18+
- A MongoDB connection string (MongoDB Atlas recommended)

## Quick Start

1) Backend setup

- Copy server/.env.example to server/.env and fill values

```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=generate_a_strong_secret
PORT=3000
# Optional (auto-seed admin on first run)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
ADMIN_USERNAME=admin
```

- Install and run server

```
# From the server folder
npm install
npm start
```

You should see "MongoDB connected" and the server listening on port 3000.

2) Frontend

- Open client/login.html in your browser. The app calls the API at http://localhost:3000.

## Core API Endpoints

- POST /api/auth/register
- POST /api/auth/login
- GET  /api/auth/me
- GET  /api/books
- POST /api/books              (admin)
- PUT  /api/books/:id          (admin)
- DELETE /api/books/:id        (admin)
- POST /api/admin/issue        (admin)
- POST /api/admin/return       (admin)
- GET  /api/member/my-books    (member)

## Basic Flows

- Admin: login -> Add New Book -> Issue Book -> Return Book
- Member: login -> See All Books -> My Borrowed Books with due dates

## Developer Information

This Library Management System was created by Nihan Nihu (nihannihu), a skilled developer who specializes in full-stack web applications. The system is designed for educational institutions to efficiently manage their library resources.

Connect with me on social media:
- Follow me on GitHub for code updates and new projects
- Follow me on Instagram (@nihannihuu) for behind-the-scenes development content
- Connect with me on LinkedIn (nihan-nihu) for professional networking

## Keywords

Nihan Nihu, nihannihu, @nihannihuu, nihan-nihu, library management system, college library, book management, library software, library app, library system, book borrowing, library automation, full-stack developer