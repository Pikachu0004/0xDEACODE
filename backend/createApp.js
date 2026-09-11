const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const authRoutes = require('./routes/authRoute');
const tripoRoutes = require('./routes/tripoRoute');
const projectRoutes = require('./routes/projectRoute');
const contactRoutes = require('./routes/contactRoute');
const freelancerRoutes = require('./routes/freelancerRoute');

function createApp() {
  const app = express();
  app.use(cors());

  app.use((req, res, next) => {
    req._reqId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    res.setHeader('X-Request-Id', req._reqId);
    next();
  });

  morgan.token('rid', (req) => req._reqId || '-');
  app.use(morgan(':rid :remote-addr :method :url :status :res[content-length] - :response-time ms'));

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/tripo', tripoRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/contact', contactRoutes);
  app.use('/api/freelancers', freelancerRoutes);

  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      message: 'Tripo API Backend is running',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/', (req, res) => {
    res.json({
      message: 'Welcome to Tripo API Backend',
      endpoints: {
        auth: '/api/auth',
        tripo: '/api/tripo',
        projects: '/api/projects',
        contact: '/api/contact',
        health: '/health',
      },
    });
  });

  app.use((req, res) => {
    console.warn('[404]', req._reqId || '-', req.method, req.originalUrl);
    res.status(404).json({ message: 'Route not found' });
  });

  app.use((err, req, res, next) => {
    const rid = req._reqId || '-';
    console.error('[error]', rid, req.method, req.originalUrl, err.message);
    console.error(err.stack);
    res.status(err.status || 500).json({
      message: err.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err : {},
    });
  });

  return app;
}

module.exports = createApp;
