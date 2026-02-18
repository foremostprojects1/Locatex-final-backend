const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const agentRoutes = require('./routes/agents');
const userRoutes = require('./routes/users');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/message');

const app = express();

// CORS configuration - MUST be at the top to handle preflight before any other middleware
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5173',
  'https://www.locatex.in',
  'https://locatex-final-frontend.vercel.app/',
  'http://127.0.0.1:5173'
];
const envOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(o => o.trim()) : [];
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or file://)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

app.use(cors(corsOptions));
// Handle preflight
app.options('*', cors(corsOptions));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50000, // Increased specifically for admin dashboard which makes many calls
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// MongoDB connection
mongoose.set('strictPopulate', false);
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// const staticPath = path.join(__dirname, 'HTML');

// if (fs.existsSync(staticPath)) {
//   app.use(express.static(staticPath));

//   app.get('*', (req, res) => {
//     res.sendFile(path.join(staticPath, 'index.html'));
//   });
// }
// Routes
// Diagnostic helper to identify bad router exports
function mountRoute(path, routerModule, name) {
  try {
    console.log(`[Mount] ${name} typeof:`, typeof routerModule, 'isRouterLike:', !!(routerModule && routerModule.use));
    app.use(path, routerModule);
    console.log(`[Mount] ${name} mounted at ${path}`);
  } catch (e) {
    console.error(`[Mount] Failed to mount ${name} at ${path}:`, e && e.message);
    throw e;
  }
}

mountRoute('/api/auth', authRoutes, 'authRoutes');
mountRoute('/api/properties', propertyRoutes, 'propertyRoutes');
mountRoute('/api/agents', agentRoutes, 'agentRoutes');
mountRoute('/api/users', userRoutes, 'userRoutes');
mountRoute('/api/contact', contactRoutes, 'contactRoutes');
mountRoute('/api/admin', adminRoutes, 'adminRoutes');
mountRoute('/api/messages', messageRoutes, 'messageRoutes');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Real Estate API is running!',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
});
