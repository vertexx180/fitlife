const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fitlife', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB połączony'))
.catch(err => console.error('❌ Błąd MongoDB:', err));

// Schemas
const userSchema = new mongoose.Schema({
  login: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'owner'], default: 'user' },
  plan: { type: String, default: 'Andrut Plan' },
  lastLogin: { type: Date },
  lastIP: { type: String },
  geoLocation: { type: String },
  createdAt: { type: Date, default: Date.now },
  workoutHistory: [{
    date: String,
    level: String,
    duration: Number,
    hour: String,
    completed: Boolean
  }],
  activeWorkout: {
    date: String,
    level: String,
    currentExerciseIndex: Number,
    timer: Number,
    startTime: Date
  }
});

const planSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  isPaid: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  days: {
    monday: { name: String, emoji: String, exercises: Array },
    tuesday: { name: String, emoji: String, exercises: Array },
    wednesday: { name: String, emoji: String, exercises: Array },
    thursday: { name: String, emoji: String, exercises: Array },
    friday: { name: String, emoji: String, exercises: Array },
    saturday: { name: String, emoji: String, exercises: Array },
    sunday: { name: String, emoji: String, exercises: Array }
  },
  purchaseCount: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 }
});

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  action: String,
  details: String,
  targetUser: String,
  ipAddress: String,
  timestamp: { type: Date, default: Date.now }
});

const purchaseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  planName: String,
  price: Number,
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Plan = mongoose.model('Plan', planSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
const Purchase = mongoose.model('Purchase', purchaseSchema);

// Middleware do weryfikacji tokenu
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Brak tokenu autoryzacji' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fitlife_secret_key_2025');
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Nieprawidłowy token' });
  }
};

// Middleware do sprawdzania roli admina
const verifyAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      return res.status(403).json({ error: 'Brak uprawnień administratora' });
    }
    req.currentUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Błąd serwera' });
  }
};

// Middleware do sprawdzania roli ownera
const verifyOwner = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'owner') {
      return res.status(403).json({ error: 'Brak uprawnień właściciela' });
    }
    req.currentUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Błąd serwera' });
  }
};

// Funkcja logowania działań adminów
async function logAdminAction(userId, userName, action, details, targetUser, ipAddress) {
  try {
    const log = new AuditLog({
      userId,
      userName,
      action,
      details,
      targetUser,
      ipAddress
    });
    await log.save();
  } catch (error) {
    console.error('Błąd logowania:', error);
  }
}

// Funkcja do pobierania geolokalizacji z IP
async function getGeoLocation(ip) {
  try {
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.')) {
      return 'Localhost';
    }
    
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    const data = response.data;
    
    if (data.status === 'success') {
      return `${data.city}, ${data.regionName}, ${data.country}`;
    }
    return 'Nieznana lokalizacja';
  } catch (error) {
    console.error('Błąd geolokalizacji:', error.message);
    return 'Nieznana lokalizacja';
  }
}

// ROUTES

// 🔐 Rejestracja
app.post('/api/register', async (req, res) => {
  try {
    const { login, password, firstName, lastName } = req.body;

    const existingUser = await User.findOne({ login });
    if (existingUser) {
      return res.status(400).json({ error: 'Użytkownik już istnieje' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const geoLocation = await getGeoLocation(ip);

    const user = new User({
      login,
      password: hashedPassword,
      firstName,
      lastName,
      lastIP: ip,
      geoLocation
    });

    await user.save();
    res.status(201).json({ message: 'Użytkownik utworzony pomyślnie' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔐 Logowanie
app.post('/api/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    const user = await User.findOne({ login });
    if (!user) {
      return res.status(401).json({ error: 'Nieprawidłowy login lub hasło' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Nieprawidłowy login lub hasło' });
    }

    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const geoLocation = await getGeoLocation(ip);

    user.lastLogin = new Date();
    user.lastIP = ip;
    user.geoLocation = geoLocation;
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'fitlife_secret_key_2025',
      { expiresIn: '7d' }
    );

    const userData = {
      id: user._id,
      login: user.login,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      plan: user.plan,
      lastLogin: user.lastLogin,
      lastIP: user.lastIP,
      geoLocation: user.geoLocation,
      workoutHistory: user.workoutHistory,
      activeWorkout: user.activeWorkout
    };

    res.json({ token, user: userData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 👤 Pobierz profil użytkownika
app.get('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📝 Aktualizuj profil użytkownika
app.put('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const { firstName, lastName, plan } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { firstName, lastName, plan },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 💪 Rozpocznij/Wznów trening
app.post('/api/workout/start', verifyToken, async (req, res) => {
  try {
    const { level } = req.body;
    const user = await User.findById(req.userId);
    const today = new Date().toISOString().split('T')[0];

    // Sprawdź czy trening już był dzisiaj
    const todayWorkout = user.workoutHistory.find(w => w.date === today && w.completed);
    if (todayWorkout) {
      return res.status(400).json({ error: 'Trening na dzisiaj już został ukończony' });
    }

    // Sprawdź czy jest aktywny trening
    if (user.activeWorkout && user.activeWorkout.date === today) {
      return res.json({ 
        message: 'Wznowiono trening',
        activeWorkout: user.activeWorkout 
      });
    }

    // Rozpocznij nowy trening
    user.activeWorkout = {
      date: today,
      level,
      currentExerciseIndex: 0,
      timer: 0,
      startTime: new Date()
    };

    await user.save();
    res.json({ 
      message: 'Rozpoczęto trening',
      activeWorkout: user.activeWorkout 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 💪 Aktualizuj postęp treningu
app.put('/api/workout/progress', verifyToken, async (req, res) => {
  try {
    const { currentExerciseIndex, timer } = req.body;
    const user = await User.findById(req.userId);

    if (user.activeWorkout) {
      user.activeWorkout.currentExerciseIndex = currentExerciseIndex;
      user.activeWorkout.timer = timer;
      await user.save();
    }

    res.json({ message: 'Postęp zapisany' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 💪 Zakończ trening
app.post('/api/workout/finish', verifyToken, async (req, res) => {
  try {
    const { duration } = req.body;
    const user = await User.findById(req.userId);

    if (user.activeWorkout) {
      user.workoutHistory.push({
        date: user.activeWorkout.date,
        level: user.activeWorkout.level,
        duration,
        hour: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
        completed: true
      });

      user.activeWorkout = undefined;
      await user.save();
    }

    res.json({ message: 'Trening ukończony', workoutHistory: user.workoutHistory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📊 Pobierz historię treningów
app.get('/api/workout/history', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json(user.workoutHistory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🏋️ Pobierz plany treningowe
app.get('/api/plans', verifyToken, async (req, res) => {
  try {
    const plans = await Plan.find();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🏋️ Pobierz konkretny plan
app.get('/api/plans/:name', verifyToken, async (req, res) => {
  try {
    const plan = await Plan.findOne({ name: req.params.name });
    if (!plan) {
      return res.status(404).json({ error: 'Plan nie znaleziony' });
    }
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === ADMIN ROUTES ===

// 👥 Pobierz wszystkich użytkowników (admin)
app.get('/api/admin/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 👤 Pobierz szczegóły użytkownika (admin)
app.get('/api/admin/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✏️ Edytuj użytkownika (admin)
app.put('/api/admin/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { firstName, lastName, login, plan, role } = req.body;
    const targetUser = await User.findById(req.params.id);
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, login, plan, role },
      { new: true }
    ).select('-password');
    
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await logAdminAction(
      req.userId,
      req.currentUser.login,
      'EDIT_USER',
      `Edytowano użytkownika: ${targetUser.login}`,
      targetUser.login,
      ip
    );
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔑 Pokaż info o haśle (admin)
app.post('/api/admin/users/:id/show-password', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { adminPassword } = req.body;
    
    const admin = await User.findById(req.userId);
    const isValidPassword = await bcrypt.compare(adminPassword, admin.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Nieprawidłowe hasło administratora' });
    }

    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const targetUser = await User.findById(req.params.id);
    
    await logAdminAction(
      req.userId,
      admin.login,
      'VIEW_PASSWORD_INFO',
      `Próba dostępu do hasła użytkownika: ${targetUser.login}`,
      targetUser.login,
      ip
    );

    res.json({ 
      message: 'Hasło jest zahashowane algorytmem bcrypt',
      info: 'Hasła nie można odszyfrować. Użyj funkcji resetowania hasła.',
      hash: targetUser.password.substring(0, 20) + '...'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔄 Generuj link do resetu hasła (admin)
app.post('/api/admin/users/:id/reset-password', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const resetToken = jwt.sign(
      { userId: user._id, type: 'reset' },
      process.env.JWT_SECRET || 'fitlife_secret_key_2025',
      { expiresIn: '1h' }
    );
    
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await logAdminAction(
      req.userId,
      req.currentUser.login,
      'RESET_PASSWORD',
      `Wygenerowano link resetowania dla: ${user.login}`,
      user.login,
      ip
    );
    
    res.json({ resetLink });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🗑️ Usuń użytkownika (admin)
app.delete('/api/admin/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    await User.findByIdAndDelete(req.params.id);
    
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await logAdminAction(
      req.userId,
      req.currentUser.login,
      'DELETE_USER',
      `Usunięto użytkownika: ${targetUser.login}`,
      targetUser.login,
      ip
    );
    
    res.json({ message: 'Użytkownik usunięty' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🏋️ Dodaj nowy plan (admin)
app.post('/api/admin/plans', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const plan = new Plan(req.body);
    await plan.save();
    
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await logAdminAction(
      req.userId,
      req.currentUser.login,
      'ADD_PLAN',
      `Dodano nowy plan: ${plan.name}`,
      null,
      ip
    );
    
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🗑️ Usuń plan (admin)
app.delete('/api/admin/plans/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    await Plan.findByIdAndDelete(req.params.id);
    
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await logAdminAction(
      req.userId,
      req.currentUser.login,
      'DELETE_PLAN',
      `Usunięto plan: ${plan.name}`,
      null,
      ip
    );
    
    res.json({ message: 'Plan usunięty' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📊 Statystyki aplikacji (admin)
app.get('/api/admin/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: { $in: ['admin', 'owner'] } });
    const activeToday = await User.countDocuments({
      lastLogin: { 
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });
    
    const allUsers = await User.find();
    const totalWorkouts = allUsers.reduce((sum, user) => sum + user.workoutHistory.length, 0);
    
    res.json({
      totalUsers,
      totalAdmins,
      activeToday,
      totalWorkouts,
      totalPlans: await Plan.countDocuments()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === OWNER ROUTES ===

// 📜 Pobierz logi adminów (owner)
app.get('/api/owner/audit-logs', verifyToken, verifyOwner, async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(100)
      .populate('userId', 'login firstName lastName');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 💰 Statystyki zakupów (owner)
app.get('/api/owner/purchase-stats', verifyToken, verifyOwner, async (req, res) => {
  try {
    const purchases = await Purchase.find().populate('userId', 'login firstName lastName');
    const totalRevenue = purchases.reduce((sum, p) => sum + p.price, 0);
    const plans = await Plan.find();
    
    const planStats = plans.map(plan => ({
      name: plan.name,
      purchases: plan.purchaseCount,
      revenue: plan.revenue
    }));

    res.json({
      totalRevenue,
      totalPurchases: purchases.length,
      recentPurchases: purchases.slice(0, 10),
      planStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 👥 Zarządzanie adminami (owner)
app.get('/api/owner/admins', verifyToken, verifyOwner, async (req, res) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'owner'] } }).select('-password');
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📊 Statystyki użytkowników (owner)
app.get('/api/owner/user-stats', verifyToken, verifyOwner, async (req, res) => {
  try {
    const users = await User.find();
    const totalUsers = users.length;
    const activeUsers = users.filter(u => {
      const daysSinceLogin = (new Date() - new Date(u.lastLogin)) / (1000 * 60 * 60 * 24);
      return daysSinceLogin <= 7;
    }).length;

    const usersByPlan = {};
    users.forEach(u => {
      usersByPlan[u.plan] = (usersByPlan[u.plan] || 0) + 1;
    });

    const avgWorkoutsPerUser = users.reduce((sum, u) => sum + u.workoutHistory.length, 0) / totalUsers;

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      usersByPlan,
      avgWorkoutsPerUser: avgWorkoutsPerUser.toFixed(2),
      newUsersThisMonth: users.filter(u => {
        const userDate = new Date(u.createdAt);
        const now = new Date();
        return userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear();
      }).length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔧 Konfiguracja systemu (owner)
app.get('/api/owner/system-config', verifyToken, verifyOwner, async (req, res) => {
  try {
    const dbStats = await mongoose.connection.db.stats();
    
    res.json({
      database: {
        size: (dbStats.dataSize / 1024 / 1024).toFixed(2) + ' MB',
        collections: dbStats.collections,
        indexes: dbStats.indexes
      },
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: (process.uptime() / 3600).toFixed(2) + ' godzin'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📧 Wysyłanie powiadomień (owner)
app.post('/api/owner/send-notification', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { title, message, userIds } = req.body;
    
    // W przyszłości: integracja z systemem email/push notifications
    // Na razie logujemy
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await logAdminAction(
      req.userId,
      req.currentUser.login,
      'SEND_NOTIFICATION',
      `Wysłano powiadomienie: "${title}" do ${userIds?.length || 'wszystkich'} użytkowników`,
      null,
      ip
    );
    
    res.json({ 
      message: 'Powiadomienie wysłane',
      recipients: userIds?.length || 'wszyscy użytkownicy'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🗄️ Backup bazy danych (owner)
app.post('/api/owner/backup-database', verifyToken, verifyOwner, async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await logAdminAction(
      req.userId,
      req.currentUser.login,
      'DATABASE_BACKUP',
      'Zainicjowano backup bazy danych',
      null,
      ip
    );
    
    // W przyszłości: rzeczywisty backup
    res.json({ 
      message: 'Backup zainicjowany',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🚀 Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'FitLife Backend działa!' });
});

// Inicjalizacja domyślnego planu
async function initializeDefaultPlan() {
  try {
    const existingPlan = await Plan.findOne({ name: 'Andrut Plan' });
    if (!existingPlan) {
      const andrutPlan = new Plan({
        name: 'Andrut Plan',
        isPaid: false,
        price: 0,
        days: {
          monday: {
            name: 'Ręce + Klatka',
            emoji: '🧨',
            exercises: [
              { name: 'Pompki klasyczne', description: 'Dłonie na szerokość barków, ciało proste, opuszczasz klatę prawie do ziemi i wypychasz się.', reps: { easy: '3×10', medium: '4×15', hard: '5×20' } },
              { name: 'Pompki diamentowe', description: 'Dłonie blisko siebie w kształt diamentu; mocno działa triceps.', reps: { easy: '3×8', medium: '4×10', hard: '5×12' } },
              { name: 'Dipy między krzesłami', description: 'Opierasz się rękami na dwóch krzesłach, zginając łokcie za sobą.', reps: { easy: '3×8', medium: '4×10', hard: '5×12' } },
              { name: 'Uginanie ramion z plecakiem', description: 'Stajesz prosto, trzymasz plecak jak hantle i uginasz ręce do góry (biceps).', reps: { easy: '3×10', medium: '4×12', hard: '5×15' } }
            ]
          },
          tuesday: { name: 'Brzuch + Core', emoji: '🔥', exercises: [{ name: 'Crunches', description: 'Leżysz, unosisz klatkę.', reps: { easy: '3×15', medium: '4×20', hard: '5×25' } }, { name: 'Leg raises', description: 'Nogi proste, unosisz do góry.', reps: { easy: '3×10', medium: '4×15', hard: '5×20' } }, { name: 'Russian twists', description: 'Skręcasz tułów.', reps: { easy: '3×15', medium: '4×25', hard: '5×30' } }, { name: 'Plank', description: 'Deska.', reps: { easy: '3×20s', medium: '3×40s', hard: '4×60s' } }] },
          wednesday: { name: 'Full Body', emoji: '⚡', exercises: [{ name: 'Przysiady', description: 'Stopy na szerokość barków.', reps: { easy: '3×15', medium: '4×20', hard: '5×25' } }, { name: 'Burpees', description: 'Przysiad, plank, wyskok.', reps: { easy: '3×5', medium: '4×7', hard: '5×10' } }, { name: 'Pompki szerokie', description: 'Dłonie szeroko.', reps: { easy: '3×10', medium: '4×12', hard: '5×15' } }, { name: 'Plank z unoszeniem rąk', description: 'Deska z naprzemiennym unoszeniem.', reps: { easy: '3×20s', medium: '3×40s', hard: '4×60s' } }] },
          thursday: { name: 'Ręce + Klatka (Progres)', emoji: '💪', exercises: [{ name: 'Pompki klasyczne', description: 'Zwiększ tempo o 10-20%.', reps: { easy: '3×12', medium: '4×17', hard: '5×24' } }, { name: 'Pompki diamentowe', description: 'Dłonie blisko.', reps: { easy: '3×9', medium: '4×12', hard: '5×14' } }, { name: 'Dipy', description: 'Między krzesłami.', reps: { easy: '3×9', medium: '4×12', hard: '5×14' } }, { name: 'Max pompki', description: 'Ile dasz radę.', reps: { easy: 'MAX', medium: 'MAX', hard: 'MAX' } }] },
          friday: { name: 'Brzuch + Cardio', emoji: '🔥', exercises: [{ name: 'Mountain climbers', description: 'Biegniesz w miejscu.', reps: { easy: '3×20s', medium: '4×30s', hard: '5×40s' } }, { name: 'Crunches', description: 'Brzuszki.', reps: { easy: '3×15', medium: '4×20', hard: '5×25' } }, { name: 'Leg raises', description: 'Unoszenie nóg.', reps: { easy: '3×10', medium: '4×15', hard: '5×20' } }, { name: 'Pajacyki', description: 'Cardio.', reps: { easy: '3×30s', medium: '4×45s', hard: '5×60s' } }] },
          saturday: { name: 'Full Body + Ramiona', emoji: '🦾', exercises: [{ name: 'Pompki diamentowe', description: 'Dłonie blisko.', reps: { easy: '3×8', medium: '4×10', hard: '5×12' } }, { name: 'Przysiady', description: 'Głębokie.', reps: { easy: '3×15', medium: '4×20', hard: '5×25' } }, { name: 'Biceps z plecakiem', description: 'Uginanie.', reps: { easy: '3×10', medium: '4×12', hard: '5×15' } }, { name: 'Dipy', description: 'Między krzesłami.', reps: { easy: '3×8', medium: '4×10', hard: '5×12' } }, { name: 'Plank max', description: 'Jak najdłużej.', reps: { easy: '3×20s', medium: '3×40s', hard: '4×60s' } }] },
          sunday: { name: 'Odpoczynek', emoji: '🧘', exercises: [{ name: 'Skłony', description: 'Rozciąganie.', reps: { easy: '3×30s', medium: '3×30s', hard: '3×30s' } }, { name: 'Rozciąganie klatki', description: 'Ręce w bok.', reps: { easy: '3×20s', medium: '3×20s', hard: '3×20s' } }, { name: 'Krążenia ramion', description: 'Rozgrzewka.', reps: { easy: '3×15', medium: '3×15', hard: '3×15' } }, { name: 'Pozycja dziecka', description: 'Relaks.', reps: { easy: 'relaks', medium: 'relaks', hard: 'relaks' } }] }
