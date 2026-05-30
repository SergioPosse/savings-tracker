require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/assets', authMiddleware, require('./routes/assets'));
app.use('/api/prices', authMiddleware, require('./routes/prices'));
app.use('/api/platforms', authMiddleware, require('./routes/platforms'));

const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('DB init failed:', err);
    process.exit(1);
  });
