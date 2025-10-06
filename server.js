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
  }]
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
  }
});

const User = mongoose.model('User', userSchema);
const Plan = mongoose.model('Plan', planSchema);

// Middleware do weryfikacji tokenu
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Brak tokenu autoryzacji' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fitlife_secret_key_2025');
    req.userId = decoded.userId;
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
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Błąd serwera' });
  }
};

// Funkcja do pobierania geolokalizacji z IP
async function getGeoLocation(ip) {
  try {
    // Pomijamy lokalne IP
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

    // Sprawdź czy użytkownik już istnieje
    const existingUser = await User.findOne({ login });
    if (existingUser) {
      return res.status(400).json({ error: 'Użytkownik już istnieje' });
    }

    // Hash hasła
    const hashedPassword = await bcrypt.hash(password, 10);

    // Pobierz IP i geolokalizację
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const geoLocation = await getGeoLocation(ip);

    // Stwórz użytkownika
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

    // Znajdź użytkownika
    const user = await User.findOne({ login });
    if (!user) {
      return res.status(401).json({ error: 'Nieprawidłowy login lub hasło' });
    }

    // Sprawdź hasło
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Nieprawidłowy login lub hasło' });
    }

    // Pobierz IP i geolokalizację
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const geoLocation = await getGeoLocation(ip);

    // Aktualizuj dane logowania
    user.lastLogin = new Date();
    user.lastIP = ip;
    user.geoLocation = geoLocation;
    await user.save();

    // Generuj token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'fitlife_secret_key_2025',
      { expiresIn: '7d' }
    );

    // Zwróć dane użytkownika (bez hasła)
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
      workoutHistory: user.workoutHistory
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

// 💪 Dodaj trening do historii
app.post('/api/workout', verifyToken, async (req, res) => {
  try {
    const { date, level, duration, hour } = req.body;
    
    const user = await User.findById(req.userId);
    user.workoutHistory.push({
      date,
      level,
      duration,
      hour,
      completed: true
    });
    
    await user.save();
    res.json({ message: 'Trening zapisany', workoutHistory: user.workoutHistory });
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
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, login, plan, role },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔑 Pokaż hasło użytkownika (admin z potwierdzeniem)
app.post('/api/admin/users/:id/show-password', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { adminPassword } = req.body;
    
    // Sprawdź hasło admina
    const admin = await User.findById(req.userId);
    const isValidPassword = await bcrypt.compare(adminPassword, admin.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Nieprawidłowe hasło administratora' });
    }

    // To tylko pokazuje, że hasło jest zahashowane - w prawdziwej apce NIE zwracamy hasła
    res.json({ 
      message: 'Hasło jest zahashowane i nie może być odszyfrowane',
      info: 'Użyj funkcji resetowania hasła aby wysłać link do zmiany'
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
    
    res.json({ resetLink });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🗑️ Usuń użytkownika (admin)
app.delete('/api/admin/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
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
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🗑️ Usuń plan (admin)
app.delete('/api/admin/plans/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.json({ message: 'Plan usunięty' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📊 Statystyki aplikacji (admin/owner)
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

// 🚀 Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'FitLife Backend działa!' });
});

// Inicjalizacja domyślnego planu Andrut
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
              {
                name: 'Pompki klasyczne',
                description: 'Dłonie na szerokość barków, ciało proste, opuszczasz klatę prawie do ziemi i wypychasz się.',
                reps: { easy: '3×10', medium: '4×15', hard: '5×20' }
              },
              {
                name: 'Pompki diamentowe',
                description: 'Dłonie blisko siebie w kształt diamentu; mocno działa triceps.',
                reps: { easy: '3×8', medium: '4×10', hard: '5×12' }
              },
              {
                name: 'Dipy między krzesłami',
                description: 'Opierasz się rękami na dwóch krzesłach, zginając łokcie za sobą.',
                reps: { easy: '3×8', medium: '4×10', hard: '5×12' }
              },
              {
                name: 'Uginanie ramion z plecakiem',
                description: 'Stajesz prosto, trzymasz plecak jak hantle i uginasz ręce do góry (biceps).',
                reps: { easy: '3×10', medium: '4×12', hard: '5×15' }
              }
            ]
          },
          tuesday: {
            name: 'Brzuch + Core',
            emoji: '🔥',
            exercises: [
              {
                name: 'Crunches (brzuszki)',
                description: 'Leżysz, unosisz klatkę i napinasz brzuch, nie odrywaj całych pleców.',
                reps: { easy: '3×15', medium: '4×20', hard: '5×25' }
              },
              {
                name: 'Leg raises (unoszenie nóg)',
                description: 'Leżysz, nogi proste, unosisz do góry, nie dotykając ziemi.',
                reps: { easy: '3×10', medium: '4×15', hard: '5×20' }
              },
              {
                name: 'Russian twists',
                description: 'Siedzisz, lekko odchylony, skręcasz tułów raz w prawo, raz w lewo.',
                reps: { easy: '3×15', medium: '4×25', hard: '5×30' }
              },
              {
                name: 'Plank (deska)',
                description: 'Opierasz się na łokciach i palcach, ciało proste jak deska.',
                reps: { easy: '3×20s', medium: '3×40s', hard: '4×60s' }
              }
            ]
          },
          wednesday: {
            name: 'Full Body',
            emoji: '⚡',
            exercises: [
              {
                name: 'Przysiady',
                description: 'Stopy na szerokość barków, schodzisz jak na krzesło.',
                reps: { easy: '3×15', medium: '4×20', hard: '5×25' }
              },
              {
                name: 'Burpees',
                description: 'Przysiad → plank → powrót → wyskok w górę.',
                reps: { easy: '3×5', medium: '4×7', hard: '5×10' }
              },
              {
                name: 'Pompki szerokie',
                description: 'Dłonie szerzej niż barki, skup się na klacie.',
                reps: { easy: '3×10', medium: '4×12', hard: '5×15' }
              },
              {
                name: 'Plank z naprzemiennym unoszeniem rąk',
                description: 'Klasyczna deska, ale raz unosisz prawą, raz lewą rękę.',
                reps: { easy: '3×20s', medium: '3×40s', hard: '4×60s' }
              }
            ]
          },
          thursday: {
            name: 'Ręce + Klatka (Progres)',
            emoji: '💪',
            exercises: [
              {
                name: 'Pompki klasyczne',
                description: 'Powtarzasz poniedziałek, ale zwiększ tempo o 10-20%.',
                reps: { easy: '3×12', medium: '4×17', hard: '5×24' }
              },
              {
                name: 'Pompki diamentowe',
                description: 'Dłonie blisko siebie.',
                reps: { easy: '3×9', medium: '4×12', hard: '5×14' }
              },
              {
                name: 'Dipy między krzesłami',
                description: 'Opierasz się rękami na dwóch krzesłach.',
                reps: { easy: '3×9', medium: '4×12', hard: '5×14' }
              },
              {
                name: 'Max pompki',
                description: 'Zrób tyle pompek ile dasz radę bez przerwy.',
                reps: { easy: 'MAX', medium: 'MAX', hard: 'MAX' }
              }
            ]
          },
          friday: {
            name: 'Brzuch + Cardio',
            emoji: '🔥',
            exercises: [
              {
                name: 'Mountain climbers',
                description: 'Pozycja planku, biegniesz w miejscu, kolana do klaty.',
                reps: { easy: '3×20s', medium: '4×30s', hard: '5×40s' }
              },
              {
                name: 'Crunches',
                description: 'Leżysz, unosisz klatkę i napinasz brzuch.',
                reps: { easy: '3×15', medium: '4×20', hard: '5×25' }
              },
              {
                name: 'Leg raises',
                description: 'Leżysz, nogi proste, unosisz do góry.',
                reps: { easy: '3×10', medium: '4×15', hard: '5×20' }
              },
              {
                name: 'Pajacyki / Skakanka',
                description: 'Tempo szybkie, poprawia wydolność.',
                reps: { easy: '3×30s', medium: '4×45s', hard: '5×60s' }
              }
            ]
          },
          saturday: {
            name: 'Full Body + Ramiona',
            emoji: '🦾',
            exercises: [
              {
                name: 'Pompki diamentowe',
                description: 'Dłonie blisko siebie.',
                reps: { easy: '3×8', medium: '4×10', hard: '5×12' }
              },
              {
                name: 'Przysiady',
                description: 'Stopy na szerokość barków.',
                reps: { easy: '3×15', medium: '4×20', hard: '5×25' }
              },
              {
                name: 'Biceps z plecakiem',
                description: 'Uginanie ramion.',
                reps: { easy: '3×10', medium: '4×12', hard: '5×15' }
              },
              {
                name: 'Dipy',
                description: 'Między krzesłami.',
                reps: { easy: '3×8', medium: '4×10', hard: '5×12' }
              },
              {
                name: 'Plank (max czas)',
                description: 'Trzymaj jak najdłużej.',
                reps: { easy: '3×20s', medium: '3×40s', hard: '4×60s' }
              }
            ]
          },
          sunday: {
            name: 'Odpoczynek / Rozciąganie',
            emoji: '🧘',
            exercises: [
              {
                name: 'Skłony w przód',
                description: 'Dotknij palców stóp.',
                reps: { easy: '3×30s', medium: '3×30s', hard: '3×30s' }
              },
              {
                name: 'Rozciąganie klatki',
                description: 'Ręce w bok i do tyłu.',
                reps: { easy: '3×20s', medium: '3×20s', hard: '3×20s' }
              },
              {
                name: 'Krążenia ramion',
                description: 'Krążenia barków.',
                reps: { easy: '3×15', medium: '3×15', hard: '3×15' }
              },
              {
                name: 'Plank lub pozycja dziecka',
                description: 'Rozluźniasz ciało, żeby mięśnie rosły.',
                reps: { easy: 'relaks', medium: 'relaks', hard: 'relaks' }
              }
            ]
          }
        }
      });
      
      await andrutPlan.save();
      console.log('✅ Domyślny plan Andrut został utworzony');
    }
  } catch (error) {
    console.error('❌ Błąd tworzenia domyślnego planu:', error);
  }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Serwer działa na porcie ${PORT}`);
  await initializeDefaultPlan();
});
