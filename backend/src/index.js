require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const assetsRoutes = require('./routes/assets.routes');
const maintenanceRoutes = require('./routes/maintenance.routes');
const usersRoutes = require('./routes/users.routes');
const { startReminderCron } = require('./services/reminder.service');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/users', usersRoutes);

// Handler generic de erori
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Eroare interna de server.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API pornit pe portul ${PORT}`);
  startReminderCron();
});
