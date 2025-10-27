'use strict'

;(async function cleanupSW(){
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const r of regs) { try { await r.unregister() } catch {} }
    }
    if (window.caches && caches.keys) {
      const keys = await caches.keys()
      for (const k of keys) { try { await caches.delete(k) } catch {} }
    }
  } catch {}
})()

const API_BASE = 'http://localhost:3000'

function getToken() { return localStorage.getItem('authToken') }
function setToken(t) { localStorage.setItem('authToken', t) }
function clearToken() { localStorage.removeItem('authToken') }

async function api(path, opts = {}) {
  const headers = opts.headers || {}
  if (!(opts.body instanceof FormData) && (opts.method && opts.method !== 'GET')) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch(API_BASE + path, {
    method: opts.method || 'GET',
    headers,
    body: opts.body instanceof FormData ? opts.body : (opts.body ? JSON.stringify(opts.body) : undefined),
  })
  if (!res.ok) {
    let err
    try { err = await res.json() } catch { err = { error: res.statusText } }
    const msg = err && err.error ? err.error : ('HTTP ' + res.status)
    throw new Error(msg)
  }
  return res.json()
}

function byId(id){ return document.getElementById(id) }

// Loading indicator functions
function showLoading(message = 'Loading...') {
  // Remove any existing loading overlay
  const existing = byId('loading-overlay')
  if (existing) existing.remove()
  
  // Create loading overlay
  const overlay = document.createElement('div')
  overlay.id = 'loading-overlay'
  overlay.className = 'loading-overlay'
  overlay.innerHTML = `
    <div class="loading-container">
      <div class="loading"></div>
      <div class="loading-text">${message}</div>
    </div>
  `
  document.body.appendChild(overlay)
}

function hideLoading() {
  const overlay = byId('loading-overlay')
  if (overlay) overlay.remove()
}

// Shared logout handler
const logoutBtn = byId('logoutBtn')
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault()
    clearToken()
    window.location.href = 'login.html'
  })

  const seedBtn = byId('seedBtn')
  const issueMsg2 = byId('issueMsg')
  if (seedBtn) seedBtn.addEventListener('click', async () => {
    if (!confirm('Seed a set of demo books?')) return
    issueMsg2.textContent = 'Seeding...'
    try {
      const r = await api('/api/admin/seed-books', { method: 'POST' })
      issueMsg2.textContent = `Seeded ${r.created}. Total: ${r.total}`
    } catch (e) {
      issueMsg2.textContent = e.message
    }
  })

  // Requests panel
  async function loadRequests() {
    try {
      const list = await api('/api/admin/requests')
      const wrap = byId('requestsList')
      if (!wrap) return
      wrap.innerHTML = ''
      list.forEach(r => {
        const row = document.createElement('div')
        row.className = 'card'
        const who = r.user ? `${r.user.username} (${r.user.email})` : 'Unknown user'
        row.innerHTML = `<div><strong>${r.bookIsbn}</strong> — ${who}</div>
          <div class="mt-2">
            <button data-id="${r._id}" class="btn-approve">Approve</button>
            <button data-id="${r._id}" class="btn-reject">Reject</button>
          </div>`
        wrap.appendChild(row)
      })
      wrap.querySelectorAll('.btn-approve').forEach(b => b.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id')
        if (confirm('Approve this borrow request?')) {
          try { 
            await api(`/api/admin/requests/${id}/approve`, { method: 'POST' }); 
            alert('Borrow request approved');
            await loadRequests(); 
          } catch (err) { 
            alert('Error: ' + err.message); 
          }
        }
      }))
      wrap.querySelectorAll('.btn-reject').forEach(b => b.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id')
        if (confirm('Reject this borrow request?')) {
          try { 
            await api(`/api/admin/requests/${id}/reject`, { method: 'POST' }); 
            alert('Borrow request rejected');
            await loadRequests(); 
          } catch (err) { 
            alert('Error: ' + err.message); 
          }
        }
      }))
    } catch (e) {
      const wrap = byId('requestsList'); if (wrap) wrap.textContent = e.message
    }
  }
  // Load pending user registrations
  async function loadPendingUsers() {
    try {
      const users = await api('/api/admin/pending-users')
      const wrap = byId('usersList')
      if (!wrap) return
      wrap.innerHTML = ''
      if (users.length === 0) {
        wrap.innerHTML = '<div class="muted">No pending user registrations</div>'
        return
      }
      users.forEach(user => {
        const row = document.createElement('div')
        row.className = 'card'
        row.innerHTML = `
          <div><strong>${user.username}</strong></div>
          <div>Email: ${user.email}</div>
          <div>Registered: ${new Date(user.createdAt).toLocaleString()}</div>
          <div class="mt-2">
            <button data-id="${user._id}" class="btn-approve-user">Approve</button>
            <button data-id="${user._id}" class="btn-reject-user">Reject</button>
          </div>
        `
        wrap.appendChild(row)
      })
      
      // Add event listeners for approve buttons
      wrap.querySelectorAll('.btn-approve-user').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id')
          if (confirm('Approve this user registration?')) {
            try {
              await api(`/api/admin/approve-user/${id}`, { method: 'POST' })
              alert('User approved successfully')
              await loadPendingUsers() // Refresh the list
            } catch (err) {
              alert('Error: ' + err.message)
            }
          }
        })
      })
      
      // Add event listeners for reject buttons
      wrap.querySelectorAll('.btn-reject-user').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id')
          if (confirm('Reject this user registration? This action cannot be undone.')) {
            try {
              await api(`/api/admin/reject-user/${id}`, { method: 'POST' })
              alert('User registration rejected')
              await loadPendingUsers() // Refresh the list
            } catch (err) {
              alert('Error: ' + err.message)
            }
          }
        })
      })
    } catch (e) {
      const wrap = byId('usersList')
      if (wrap) wrap.textContent = e.message
    }
  }
  
  const refreshUsersBtn = byId('refreshUsers')
  if (refreshUsersBtn) refreshUsersBtn.addEventListener('click', loadPendingUsers)
  
  const refreshBtn = byId('refreshRequests')
  if (refreshBtn) refreshBtn.addEventListener('click', loadRequests)
  
  // Borrowed panel
  async function loadBorrowed() {
    try {
      const list = await api('/api/admin/borrowed')
      const wrap = byId('borrowedList')
      if (!wrap) return
      wrap.innerHTML = ''
      list.forEach(b => {
        const row = document.createElement('div')
        row.className = 'card'
        const who = b.borrowedBy ? `${b.borrowedBy.username} (${b.borrowedBy.email})` : 'Unknown'
        const due = b.dueDate ? new Date(b.dueDate).toLocaleString() : '-'
        row.innerHTML = `<div><strong>${b.title}</strong> — ${who}</div>
          <div>ISBN: ${b.isbn}</div>
          <div>Due: <span class="muted">${due}</span></div>
          <div class="mt-2">
            <input type="datetime-local" id="due-${b.isbn}">
            <button data-isbn="${b.isbn}" class="btn-save-due">Save Due Date</button>
          </div>`
        wrap.appendChild(row)
      })
      wrap.querySelectorAll('.btn-save-due').forEach(btn => btn.addEventListener('click', async (e) => {
        const isbn = e.target.getAttribute('data-isbn')
        const input = byId(`due-${isbn}`)
        const value = input && input.value
        if (!value) { alert('Pick a date and time'); return }
        showLoading('Saving due date...')
        try { 
          await api(`/api/admin/borrowed/${isbn}/due-date`, { method: 'POST', body: { dueDate: value } }); 
          await loadBorrowed()
          alert('Due date updated successfully and notification sent to user!')
        } catch (err) { 
          alert('Error: ' + err.message)
        } finally {
          hideLoading()
        }
      }))
    } catch (e) {
      const wrap = byId('borrowedList'); if (wrap) wrap.textContent = e.message
    }
  }
  const refreshBorrowed = byId('refreshBorrowed')
  if (refreshBorrowed) refreshBorrowed.addEventListener('click', loadBorrowed)
  
  // Load initial data
  ;(async function loadInitialData() {
    try {
      await loadPendingUsers()
      await loadRequests()
      await loadBorrowed()
    } catch (e) {
      console.error('Error loading initial data:', e)
    }
  })()
}

// Register page logic
if (byId('registerBtn')) {
  byId('registerBtn').addEventListener('click', async () => {
    const username = byId('regUsername').value.trim()
    const email = byId('regEmail').value.trim()
    const password = byId('regPassword').value
    const msg = byId('registerMsg')
    msg.textContent = 'Creating account...'
    msg.className = 'msg' // Reset class
    showLoading('Creating account...')
    try {
      await api('/api/auth/register', { method: 'POST', body: { username, email, password } })
      msg.textContent = 'Registered! Redirecting to login...'
      msg.className = 'msg ok' // Success message styling
      setTimeout(() => (window.location.href = 'login.html'), 1500)
    } catch (e) {
      console.error('Register failed:', e)
      msg.textContent = e.message || 'Registration failed.'
      msg.className = 'msg err' // Error message styling
    } finally {
      hideLoading()
    }
  })
}

// Login page logic
if (byId('loginBtn')) {
  byId('loginBtn').addEventListener('click', async () => {
    const email = byId('email').value.trim()
    const password = byId('password').value
    const msg = byId('loginMsg')
    msg.textContent = 'Signing in...'
    msg.className = 'msg' // Reset class
    showLoading('Signing in...')
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: { email, password } })
      setToken(data.token)
      try { localStorage.setItem('role', data.role) } catch {}
      // Decide destination by role
      if (data.role === 'admin') window.location.href = 'admin.html'
      else window.location.href = 'index.html'
    } catch (e) {
      console.error('Login failed:', e)
      msg.textContent = e.message || 'Login failed. Check your email and password.'
      msg.className = 'msg err' // Error message styling
    } finally {
      hideLoading()
    }
  })
}

// Member page logic
async function renderBooks(list) {
  const container = byId('books')
  if (!container) return
  container.innerHTML = ''
  if (!list || list.length === 0) {
    container.innerHTML = '<div class="muted">No books found. Ask an admin to add or seed demo books.</div>'
    return
  }
  list.forEach((b) => {
    const el = document.createElement('div')
    el.className = 'card'
    const badge = b.status === 'Available' ? '<span class="badge good">Available</span>' : '<span class="badge bad">Borrowed</span>'
    // Use better placeholder images with AI-generated book covers
    const ph = 'https://placehold.co/300x420/1e293b/94a3b8?text=Book+Cover'
    const imgSrc = b.coverImage || ph
    const img = `<img class="img" src="${imgSrc}" alt="${b.title}" onerror="this.onerror=null;this.src='https://placehold.co/300x420/1e293b/94a3b8?text=No+Cover'">`
    const desc = b.description ? `<div class="muted" style="font-size:14px; margin-top:8px; line-height: 1.5;">${b.description}</div>` : ''
    let actions = `<button data-isbn="${b.isbn}" class="btn-details">Details</button>`
    const role = localStorage.getItem('role')
    const token = getToken()
    
    // Show request borrow button to everyone, but prompt non-users to register
    if (b.status === 'Available') {
      actions += ` <button data-isbn="${b.isbn}" class="btn-request pulse">Request Borrow</button>`
    } else if (role === 'member') {
      actions += ` <button data-isbn="${b.isbn}" class="btn-return">Return</button>`
    }
    
    el.innerHTML = `${img}<strong>${b.title}</strong><div style="color: var(--muted); margin: 5px 0;">by ${b.author}</div><div style="font-size: 14px; color: var(--muted);">ISBN: ${b.isbn}</div><div style="margin: 10px 0;">Status: ${badge}</div>${desc}<div class="mt-2">${actions}</div>`
    container.appendChild(el)
  })

  // Wire buttons
  container.querySelectorAll('.btn-details').forEach(btn => btn.addEventListener('click', async (e) => {
    const isbn = e.target.getAttribute('data-isbn')
    try { const b = await api(`/api/books/${isbn}`); alert(`${b.title} by ${b.author}\n\n${b.description || ''}`) } catch (err) { alert(err.message) }
  }))
  container.querySelectorAll('.btn-request').forEach(btn => btn.addEventListener('click', async (e) => {
    const isbn = e.target.getAttribute('data-isbn')
    const token = getToken()
    
    // If user is not logged in, prompt them to register
    if (!token) {
      if (confirm('You need to register before borrowing books. Would you like to register now?')) {
        window.location.href = 'register.html'
        return
      } else {
        return
      }
    }
    
    // If user is logged in, proceed with borrow request
    try { 
      await api('/api/member/request-borrow', { method: 'POST', body: { bookIsbn: isbn } }); 
      alert('Request sent to librarian'); 
    } catch (err) { 
      if (err.message === 'Account pending approval') {
        alert('Your account is pending admin approval. Please wait for approval before borrowing books.');
      } else {
        alert(err.message);
      }
    }
  }))
  container.querySelectorAll('.btn-return').forEach(btn => btn.addEventListener('click', async (e) => {
    const isbn = e.target.getAttribute('data-isbn')
    try { await api('/api/member/return', { method: 'POST', body: { bookIsbn: isbn } }); await loadAllBooks(); await loadMyBooks(); } catch (err) { alert(err.message) }
  }))
}

async function loadAllBooks() {
  showLoading('Loading books...')
  try {
    const all = await api('/api/books')
    await renderBooks(all)
  } finally {
    hideLoading()
  }
}

async function loadMyBooks() {
  const container = byId('myBooks')
  if (!container) return
  try {
    const mine = await api('/api/member/my-books')
    container.innerHTML = ''
    mine.forEach((b) => {
      const el = document.createElement('div')
      el.className = 'card'
      const due = b.dueDate ? new Date(b.dueDate).toLocaleDateString() : '-'
      el.innerHTML = `<strong>${b.title}</strong><div>${b.author}</div><div>Due: ${due}</div>`
      container.appendChild(el)
    })
  } catch (e) {
    if (e.message === 'Account pending approval') {
      container.innerHTML = '<div class="muted">Your account is pending admin approval</div>'
    } else {
      container.textContent = 'Login required'
    }
  }
}

async function loadRecs() {
  const box = byId('recs')
  if (!box) return
  try {
    const recs = await api('/api/member/recommendations')
    if (!recs || recs.length === 0) { box.textContent = 'Borrow a book to see recommendations by genre'; return }
    const cards = recs.map(b => `<div class="card"><strong>${b.title}</strong><div>${b.author}</div><div class="muted">${b.genre}</div></div>`).join('')
    box.classList.remove('muted')
    box.innerHTML = cards
  } catch (e) {
    if (e.message === 'Account pending approval') {
      box.innerHTML = '<div class="muted">Your account is pending admin approval</div>'
    } else {
      box.textContent = 'Login required'
    }
  }
}

if (byId('searchBtn')) {
  byId('searchBtn').addEventListener('click', async () => {
    const q = byId('searchInput').value.toLowerCase()
    const all = await api('/api/books')
    const filtered = all.filter(b => (b.title||'').toLowerCase().includes(q) || (b.author||'').toLowerCase().includes(q) || (b.isbn||'').toLowerCase().includes(q))
    renderBooks(filtered)
  })
}

// Guard: require token for non-login pages
async function guardPage() {
  const path = location.pathname
  // Allow public access to index page
  if (path.endsWith('index.html') || path === '/' || path.endsWith('/')) return
  if (path.endsWith('login.html') || path.endsWith('register.html')) return
  if (!getToken()) { window.location.href = 'login.html'; return }
}

// Modified guard for public book viewing
async function publicGuardPage() {
  const path = location.pathname
  // Allow public access to index page for book viewing
  if (path.endsWith('index.html') || path === '/' || path.endsWith('/')) return
  if (path.endsWith('login.html') || path.endsWith('register.html')) return
  // For other pages, still require authentication
  if (!getToken()) { window.location.href = 'login.html'; return }
}

// Admin page logic
async function ensureAdmin() {
  try {
    const me = await api('/api/auth/me')
    if (me.role !== 'admin') window.location.href = 'index.html'
  } catch {
    window.location.href = 'login.html'
  }
}

async function initAdmin() {
  await ensureAdmin()
  const addBtn = byId('addBookBtn')
  const msg = byId('addBookMsg')
  if (addBtn) addBtn.addEventListener('click', async () => {
    msg.textContent = 'Adding...'
    try {
      const title = byId('title').value.trim()
      const author = byId('author').value.trim()
      const isbn = byId('isbn').value.trim()
      const genre = byId('genre').value.trim()
      const coverImage = byId('coverImage').value.trim()
      const description = byId('description').value.trim()
      const bookData = { title, author, isbn, genre }
      if (coverImage) bookData.coverImage = coverImage
      if (description) bookData.description = description
      const book = await api('/api/books', { method: 'POST', body: bookData })
      msg.textContent = `Added: ${book.title}`
      // Clear form
      byId('title').value = ''
      byId('author').value = ''
      byId('isbn').value = ''
      byId('genre').value = ''
      byId('coverImage').value = ''
      byId('description').value = ''
    } catch (e) {
      msg.textContent = e.message
    }
  })

  const issueBtn = byId('issueBtn')
  const issueMsg = byId('issueMsg')
  if (issueBtn) issueBtn.addEventListener('click', async () => {
    issueMsg.textContent = 'Issuing...'
    try {
      const bookIsbn = byId('issueIsbn').value.trim()
      const memberEmail = byId('issueEmail').value.trim()
      const r = await api('/api/admin/issue', { method: 'POST', body: { bookIsbn, memberEmail } })
      issueMsg.textContent = `Issued. Due: ${new Date(r.dueDate).toLocaleDateString()}`
    } catch (e) {
      issueMsg.textContent = e.message
    }
  })

  const returnBtn = byId('returnBtn')
  const returnMsg = byId('returnMsg')
  if (returnBtn) returnBtn.addEventListener('click', async () => {
    returnMsg.textContent = 'Returning...'
    try {
      const bookIsbn = byId('returnIsbn').value.trim()
      const r = await api('/api/admin/return', { method: 'POST', body: { bookIsbn } })
      returnMsg.textContent = r.late ? 'Returned (Late)' : 'Returned'
    } catch (e) {
      returnMsg.textContent = e.message
    }
  })
}

async function initMember() {
  await publicGuardPage()
  await loadAllBooks()
  await loadMyBooks()
  await loadRecs()
}

// Bootstrap the application
(function bootstrap(){
  const path = location.pathname
  // Use setTimeout to ensure DOM is fully loaded
  setTimeout(async () => {
    try {
      if (path.endsWith('admin.html')) await initAdmin()
      else if (path.endsWith('index.html') || path.endsWith('/') ) await initMember()
    } catch (e) {
      console.error('Bootstrap error:', e)
    }
  }, 0)
})()

// QR/Barcode scanner for admin issue ISBN
document.addEventListener('DOMContentLoaded', () => {
  const scanBtn = byId('scanToggleBtn')
  const readerDiv = byId('qrReader')
  if (!scanBtn || !readerDiv || typeof Html5Qrcode === 'undefined') return
  let scanner = null
  let active = false
  scanBtn.addEventListener('click', async () => {
    try {
      if (!active) {
        readerDiv.style.display = 'block'
        scanner = new Html5Qrcode('qrReader')
        await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 }, (decodedText) => {
          const field = byId('issueIsbn')
          if (field) field.value = decodedText.trim()
          alert('Detected: ' + decodedText)
        })
        active = true
        scanBtn.textContent = 'Stop Scanner'
      } else {
        await scanner.stop()
        await scanner.clear()
        readerDiv.style.display = 'none'
        active = false
        scanBtn.textContent = 'Start Scanner'
      }
    } catch (e) {
      alert('Scanner error: ' + (e.message || e))
    }
  })
})
