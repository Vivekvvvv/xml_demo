const path = require('path');
const express = require('express');
const authRoutes = require('./src/routes/authRoutes');
const bookRoutes = require('./src/routes/bookRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', authRoutes);
app.use('/api/books', bookRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.use((err, req, res, next) => {
  // Fallback error handler for unexpected exceptions
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message: '服务器异常' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`XML demo server is running at http://localhost:${PORT}`);
});
