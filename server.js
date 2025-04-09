const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Routes
// Submit complaint
app.post('/api/complaints', (req, res) => {
  const { name, email, complaint } = req.body;
  db.run(
    'INSERT INTO complaints (name, email, complaint) VALUES (?, ?, ?)',
    [name || 'Anonymous', email, complaint],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Get all complaints (admin only)
app.get('/api/complaints', (req, res) => {
  db.all('SELECT * FROM complaints ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Update complaint status (admin only)
app.put('/api/complaints/:id', (req, res) => {
  const { status } = req.body;
  db.run(
    'UPDATE complaints SET status = ? WHERE id = ?',
    [status, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

// Admin login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM admins WHERE username = ?', [username], (err, admin) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const passwordValid = bcrypt.compareSync(password, admin.password);
    if (!passwordValid) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.admin = true;
    res.json({ success: true });
  });
});

// Admin logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
