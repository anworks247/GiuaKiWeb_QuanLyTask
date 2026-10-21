require('dotenv').config();
const express = require('express'), path = require('path');
const { Pool } = require('pg'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
require('pg').types.setTypeParser(1082, v => v); // DATE giữ nguyên chuỗi YYYY-MM-DD
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
app.use((req, res, next) => {
  res.set({ 'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' });
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const sign = u => jwt.sign({ id: u.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const auth = (req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên hết hạn' }); }
};
const wrap = f => (req, res) => f(req, res).catch(e => {
  if (e.code === '23514' || e.code === '22007') return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  console.error(e); res.status(500).json({ error: 'Lỗi server' });
});

// ---- Auth ----
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ error: 'Cần tên, email và mật khẩu tối thiểu 6 ký tự' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email',
      [name, email.toLowerCase(), hash]);
    res.status(201).json({ token: sign(rows[0]), user: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email đã được đăng ký' });
    throw e;
  }
}));
app.post('/api/auth/login', wrap(async (req, res) => {
  const { email = '', password = '' } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(password, u.password_hash)))
    return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });
  res.json({ token: sign(u), user: { id: u.id, name: u.name, email: u.email } });
}));

// ---- Tasks CRUD (chỉ thao tác trên task của chính user) ----
app.get('/api/tasks', auth, wrap(async (req, res) => {
  const { status } = req.query;
  const { rows } = await pool.query(
    `SELECT * FROM tasks WHERE user_id=$1 AND ($2::text IS NULL OR status=$2) ORDER BY created_at DESC`,
    [req.user.id, status || null]);
  res.json(rows);
}));
app.get('/api/tasks/:id', auth, wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tasks WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  rows[0] ? res.json(rows[0]) : res.status(404).json({ error: 'Không tìm thấy task' });
}));
app.post('/api/tasks', auth, wrap(async (req, res) => {
  const { title, description, status = 'todo', priority = 'medium', due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Thiếu tiêu đề' });
  const { rows } = await pool.query(
    `INSERT INTO tasks(user_id,title,description,status,priority,due_date) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.user.id, title, description || null, status, priority, due_date || null]);
  res.status(201).json(rows[0]);
}));
app.put('/api/tasks/:id', auth, wrap(async (req, res) => {
  const { title, description, status, priority, due_date } = req.body;
  const { rows } = await pool.query(
    `UPDATE tasks SET title=COALESCE($3,title), description=COALESCE($4,description),
     status=COALESCE($5,status), priority=COALESCE($6,priority), due_date=COALESCE($7,due_date), updated_at=now()
     WHERE id=$1 AND user_id=$2 RETURNING *`,
    [req.params.id, req.user.id, title, description, status, priority, due_date]);
  rows[0] ? res.json(rows[0]) : res.status(404).json({ error: 'Không tìm thấy task' });
}));
app.delete('/api/tasks/:id', auth, wrap(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM tasks WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  rowCount ? res.status(204).end() : res.status(404).json({ error: 'Không tìm thấy task' });
}));

// ---- Dashboard ----
app.get('/api/stats', auth, wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int total,
     COUNT(*) FILTER (WHERE status='todo')::int todo,
     COUNT(*) FILTER (WHERE status='doing')::int doing,
     COUNT(*) FILTER (WHERE status='done')::int done,
     COUNT(*) FILTER (WHERE status<>'done' AND due_date < CURRENT_DATE)::int overdue
     FROM tasks WHERE user_id=$1`, [req.user.id]);
  res.json(rows[0]);
}));

app.listen(process.env.PORT || 3000, () => console.log('Server chạy tại http://localhost:' + (process.env.PORT || 3000)));
