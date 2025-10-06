import React, { useState, useEffect } from 'react';
import { Calendar, Clock, TrendingUp, Users, Key, MapPin, Edit, LogIn, Eye, RotateCcw, Upload, DollarSign, CheckCircle, X, Play, Pause, SkipForward } from 'lucide-react';

// Symulacja bazy danych w pamięci
const DB = {
  users: [
    {
      id: 1,
      login: 'user1',
      password: 'hashed_pass_user1',
      firstName: 'Jan',
      lastName: 'Kowalski',
      lastLogin: new Date('2025-10-04T18:30:00'),
      lastIP: '192.168.1.100',
      geoLocation: 'Czechowice-Dziedzice, Śląskie, Poland',
      plan: 'Andrut Plan',
      workoutHistory: [
        { date: '2025-10-01', level: 'medium', duration: 45, hour: '18:00', completed: true },
        { date: '2025-10-03', level: 'hard', duration: 52, hour: '17:30', completed: true }
      ]
    },
    {
      id: 2,
      login: 'admin',
      password: 'hashed_pass_admin',
      firstName: 'Admin',
      lastName: 'Admin',
      isAdmin: true,
      lastLogin: new Date(),
      lastIP: '192.168.1.1',
      geoLocation: 'Czechowice-Dziedzice, Śląskie, Poland',
      plan: 'Andrut Plan',
      workoutHistory: []
    }
  ],
  plans: [
    {
      id: 1,
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
              description: 'Opierasz się rękami na dwóch krzesłach, zginając łokcie za sobą, aż ciało schodzi w dół.',
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
              description: 'Stopy na szerokość barków, schodzisz jak na krzesło, kolana nie wychodzą za palce.',
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
              description: 'Powtarzasz poniedziałek, ale zwiększ tempo lub powtórzenia o 10-20%.',
              reps: { easy: '3×12', medium: '4×17', hard: '5×24' }
            },
            {
              name: 'Pompki diamentowe',
              description: 'Dłonie blisko siebie w kształt diamentu.',
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
    }
  ]
};

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginData, setLoginData] = useState({ login: '', password: '' });
  const [view, setView] = useState('login');
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [workoutInProgress, setWorkoutInProgress] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newPlanModal, setNewPlanModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  
  const today = new Date();
  const currentDay = daysOfWeek[today.getDay()];
  const currentPlan = DB.plans.find(p => p.name === currentUser?.plan);
  const todayWorkout = currentPlan?.days[currentDay];

  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleLogin = () => {
    const user = DB.users.find(u => u.login === loginData.login && u.password === `hashed_pass_${loginData.login}`);
    if (user) {
      user.lastLogin = new Date();
      setCurrentUser(user);
      setView(user.isAdmin ? 'admin' : 'dashboard');
    } else {
      alert('Nieprawidłowy login lub hasło');
    }
  };

  const startWorkout = (level) => {
    setSelectedLevel(level);
    setWorkoutInProgress(true);
    setCurrentExerciseIndex(0);
    setTimer(0);
    setView('workout');
  };

  const nextExercise = () => {
    if (currentExerciseIndex < todayWorkout.exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setTimer(0);
      setIsTimerRunning(false);
    } else {
      finishWorkout();
    }
  };

  const finishWorkout = () => {
    const workoutData = {
      date: today.toISOString().split('T')[0],
      level: selectedLevel,
      duration: Math.floor(timer / 60),
      hour: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      completed: true
    };
    currentUser.workoutHistory.push(workoutData);
    setWorkoutInProgress(false);
    setView('dashboard');
    alert('Gratulacje! Trening ukończony! 🎉');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getWorkoutForDate = (date) => {
    if (!date) return null;
    const dateStr = date.toISOString().split('T')[0];
    return currentUser?.workoutHistory.find(w => w.date === dateStr);
  };

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="bg-gray-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">FitTracker Pro</h1>
            <p className="text-gray-400">Twój osobisty trener</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Login"
              value={loginData.login}
              onChange={(e) => setLoginData({...loginData, login: e.target.value})}
              className="w-full bg-gray-700/50 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
            />
            <input
              type="password"
              placeholder="Hasło"
              value={loginData.password}
              onChange={(e) => setLoginData({...loginData, password: e.target.value})}
              className="w-full bg-gray-700/50 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
            />
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg"
            >
              Zaloguj się
            </button>
            <p className="text-xs text-gray-500 text-center mt-4">Demo: user1/user1 lub admin/admin</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">Panel Administracyjny</h1>
            <button
              onClick={() => { setCurrentUser(null); setView('login'); }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Wyloguj
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-xl border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" /> Zarządzanie Użytkownikami
              </h3>
              <div className="space-y-4">
                {DB.users.filter(u => !u.isAdmin).map(user => (
                  <div key={user.id} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <p className="text-gray-400">Login:</p>
                        <p className="text-white font-semibold">{user.login}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Ostatnie logowanie:</p>
                        <p className="text-white text-xs">{user.lastLogin.toLocaleString('pl-PL')}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">IP:</p>
                        <p className="text-white">{user.lastIP}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Lokalizacja:</p>
                        <p className="text-white text-xs">{user.geoLocation}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => { setCurrentUser(user); setView('dashboard'); }}
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        <LogIn className="w-4 h-4" /> Zaloguj
                      </button>
                      <button
                        onClick={() => { setSelectedUser(user); setShowPasswordModal(true); }}
                        className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                      >
                        <Eye className="w-4 h-4" /> Pokaż hasło
                      </button>
                      <button
                        onClick={() => setEditingUser(user)}
                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        <Edit className="w-4 h-4" /> Edytuj
                      </button>
                      <button
                        onClick={() => alert(`Link do resetowania: https://fittracker.pro/reset/${user.id}/${Math.random().toString(36)}`)}
                        className="flex items-center gap-1 bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700"
                      >
                        <RotateCcw className="w-4 h-4" /> Reset hasła
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-xl border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" /> Zarządzanie Planami Treningowymi
              </h3>
              <button
                onClick={() => setNewPlanModal(true)}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 mb-4"
              >
                + Dodaj nowy plan
              </button>
              <div className="space-y-3">
                {DB.plans.map(plan => (
                  <div key={plan.id} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white font-semibold">{plan.name}</p>
                        <p className="text-sm text-gray-400">
                          {plan.isPaid ? `💰 ${plan.price} PLN` : '🆓 Darmowy'}
                        </p>
                      </div>
                      <button className="text-red-400 hover:text-red-300">Usuń</button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 bg-gray-700/30 p-4 rounded-lg">
                <h4 className="text-white font-semibold mb-2">Format planu treningowego (JSON):</h4>
                <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
{`{
  "name": "Nazwa Planu",
  "isPaid": false,
  "price": 0,
  "days": {
    "monday": {
      "name": "Dzień 1",
      "emoji": "💪",
      "exercises": [{
        "name": "Ćwiczenie",
        "description": "Opis",
        "reps": {
          "easy": "3×10",
          "medium": "4×15",
          "hard": "5×20"
        }
      }]
    }
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 p-6 rounded-xl max-w-md w-full border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Potwierdź hasło administratora</h3>
              <input
                type="password"
                placeholder="Hasło admina"
                value={adminPasswordConfirm}
                onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (adminPasswordConfirm === 'admin') {
                      alert(`Hasło użytkownika ${selectedUser.login}: ${selectedUser.password.replace('hashed_pass_', '')}`);
                      setShowPasswordModal(false);
                      setAdminPasswordConfirm('');
                    } else {
                      alert('Nieprawidłowe hasło administratora');
                    }
                  }}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Pokaż
                </button>
                <button
                  onClick={() => { setShowPasswordModal(false); setAdminPasswordConfirm(''); }}
                  className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700"
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        )}

        {editingUser && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 p-6 rounded-xl max-w-md w-full border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Edytuj użytkownika</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Imię"
                  defaultValue={editingUser.firstName}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Nazwisko"
                  defaultValue={editingUser.lastName}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Login"
                  defaultValue={editingUser.login}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg"
                />
                <select className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg">
                  {DB.plans.map(plan => (
                    <option key={plan.id} value={plan.name}>{plan.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { alert('Zapisano zmiany'); setEditingUser(null); }}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Zapisz
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700"
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'workout') {
    const currentExercise = todayWorkout.exercises[currentExerciseIndex];
    const progress = ((currentExerciseIndex + 1) / todayWorkout.exercises.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-xl p-8 rounded-2xl border border-gray-700">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-sm">Postęp treningu</span>
                <span className="text-white font-semibold">{currentExerciseIndex + 1}/{todayWorkout.exercises.length}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-white mb-2">{currentExercise.name}</h2>
              <p className="text-gray-300 mb-4">{currentExercise.description}</p>
              <div className="inline-block bg-blue-600/20 border border-blue-500 rounded-lg px-6 py-3">
                <p className="text-2xl font-bold text-blue-400">
                  {currentExercise.reps[selectedLevel]}
                </p>
                <p className="text-sm text-gray-400">Seria × Powtórzenia</p>
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-xl p-8 mb-6">
              <div className="text-center mb-4">
                <Clock className="w-16 h-16 mx-auto text-blue-400 mb-2" />
                <p className="text-6xl font-bold text-white mb-2">{formatTime(timer)}</p>
                <p className="text-gray-400">Czas trwania ćwiczenia</p>
              </div>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-white transition-all ${
                    isTimerRunning 
                      ? 'bg-orange-600 hover:bg-orange-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isTimerRunning ? (
                    <>
                      <Pause className="w-5 h-5" /> Pauza
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" /> Start
                    </>
                  )}
                </button>
                
                <button
                  onClick={nextExercise}
                  className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-all"
                >
                  <SkipForward className="w-5 h-5" />
                  {currentExerciseIndex === todayWorkout.exercises.length - 1 ? 'Zakończ' : 'Następne'}
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setWorkoutInProgress(false);
                setView('dashboard');
              }}
              className="w-full bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600"
            >
              Przerwij trening
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'stats') {
    const currentMonth = new Date();
    const days = getDaysInMonth(currentMonth);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">Statystyki</h1>
            <button
              onClick={() => setView('dashboard')}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Powrót
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-xl border border-gray-700">
              <TrendingUp className="w-8 h-8 text-green-400 mb-2" />
              <p className="text-gray-400 text-sm">Treningi w tym miesiącu</p>
              <p className="text-3xl font-bold text-white">
                {currentUser.workoutHistory.filter(w => {
                  const workoutDate = new Date(w.date);
                  return workoutDate.getMonth() === currentMonth.getMonth();
                }).length}
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-xl border border-gray-700">
              <Clock className="w-8 h-8 text-blue-400 mb-2" />
              <p className="text-gray-400 text-sm">Łączny czas</p>
              <p className="text-3xl font-bold text-white">
                {currentUser.workoutHistory.reduce((sum, w) => sum + w.duration, 0)} min
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-xl border border-gray-700">
              <CheckCircle className="w-8 h-8 text-purple-400 mb-2" />
              <p className="text-gray-400 text-sm">Ukończone treningi</p>
              <p className="text-3xl font-bold text-white">
                {currentUser.workoutHistory.filter(w => w.completed).length}
              </p>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-xl border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Kalendarz treningów - {currentMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
            </h2>
            
            <div className="grid grid-cols-7 gap-2">
              {['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'].map(day => (
                <div key={day} className="text-center text-gray-400 font-semibold p-2">
                  {day}
                </div>
              ))}
              
              {days.map((day, idx) => {
                const workout = day ? getWorkoutForDate(day) : null;
                const isToday = day && day.toDateString() === today.toDateString();
                
                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setSelectedDate(day)}
                    onMouseLeave={() => setSelectedDate(null)}
                    className={`relative aspect-square p-2 rounded-lg border transition-all cursor-pointer ${
                      !day 
                        ? 'bg-transparent border-transparent' 
                        : workout
                        ? 'bg-green-600/20 border-green-500 hover:bg-green-600/30'
                        : isToday
                        ? 'bg-blue-600/20 border-blue-500'
                        : 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/50'
                    }`}
                  >
                    {day && (
                      <>
                        <p className="text-white text-sm font-semibold">{day.getDate()}</p>
                        {workout && (
                          <div className="absolute top-1 right-1">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedDate && getWorkoutForDate(selectedDate) && (
              <div className="mt-6 bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                <h3 className="text-white font-bold mb-2">
                  {selectedDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}
                </h3>
                {(() => {
                  const workout = getWorkoutForDate(selectedDate);
                  return (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-400">Level:</p>
                        <p className="text-white capitalize">{workout.level}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Czas:</p>
                        <p className="text-white">{workout.duration} min</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Godzina:</p>
                        <p className="text-white">{workout.hour}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Status:</p>
                        <p className="text-green-400">✓ Ukończono</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Witaj, {currentUser.firstName}!</h1>
            <p className="text-gray-400">Plan: {currentUser.plan}</p>
          </div>
          <button
            onClick={() => { setCurrentUser(null); setView('login'); }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Wyloguj
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-xl border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">
              {todayWorkout.emoji} Dzisiejszy trening
            </h2>
            <h3 className="text-xl text-gray-300 mb-4">{dayNames[today.getDay()]} - {todayWorkout.name}</h3>
            
            <div className="space-y-3 mb-6">
              {todayWorkout.exercises.map((ex, idx) => (
                <div key={idx} className="bg-gray-700/30 p-3 rounded-lg">
                  <p className="text-white font-semibold">{idx + 1}. {ex.name}</p>
                  <p className="text-gray-400 text-sm">{ex.description}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-white font-semibold">Wybierz poziom trudności:</p>
              <button
                onClick={() => startWorkout('easy')}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                🟢 Easy
              </button>
              <button
                onClick={() => startWorkout('medium')}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                🟡 Medium
              </button>
              <button
                onClick={() => startWorkout('hard')}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                🔴 Hard
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-xl border border-gray-700">
              <button
                onClick={() => setView('stats')}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-5 h-5" />
                Zobacz statystyki i kalendarz
              </button>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-xl border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Ostatnie treningi</h3>
              <div className="space-y-3">
                {currentUser.workoutHistory.slice(-5).reverse().map((w, idx) => (
                  <div key={idx} className="bg-gray-700/30 p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-white font-semibold">{new Date(w.date).toLocaleDateString('pl-PL')}</p>
                      <p className="text-gray-400 text-sm capitalize">{w.level} • {w.duration} min</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                ))}
                {currentUser.workoutHistory.length === 0 && (
                  <p className="text-gray-400 text-center py-4">Jeszcze nie masz treningów</p>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-xl p-6 rounded-xl border border-blue-500/30">
              <h3 className="text-xl font-bold text-white mb-2">💪 Motywacja dnia</h3>
              <p className="text-gray-300 italic">
                "Sukces to suma małych wysiłków powtarzanych dzień po dniu."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
