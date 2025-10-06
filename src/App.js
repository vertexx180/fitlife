import React, { useState, useEffect } from 'react';
import { Calendar, Clock, TrendingUp, Users, Key, MapPin, Edit, LogIn, Eye, RotateCcw, Upload, DollarSign, CheckCircle, X, Play, Pause, SkipForward, Settings, BarChart3, UserPlus } from 'lucide-react';

const API_URL = 'https://fitlife-gamc.onrender.com/api';

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loginData, setLoginData] = useState({ login: '', password: '' });
  const [registerData, setRegisterData] = useState({ login: '', password: '', firstName: '', lastName: '' });
  const [view, setView] = useState('login');
  const [isRegister, setIsRegister] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [workoutInProgress, setWorkoutInProgress] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [allPlans, setAllPlans] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newPlanModal, setNewPlanModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateInfo, setSelectedDateInfo] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  
  const today = new Date();
  const currentDay = daysOfWeek[today.getDay()];
  const todayWorkout = currentPlan?.days?.[currentDay];

  // Pobierz profil użytkownika przy załadowaniu
  useEffect(() => {
    if (token) {
      fetchUserProfile();
    }
  }, [token]);

  // Timer
  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // API Calls
  const apiCall = async (endpoint, method = 'GET', body = null) => {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${API_URL}${endpoint}`, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Błąd serwera');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const fetchUserProfile = async () => {
    try {
      const user = await apiCall('/user/profile');
      setCurrentUser(user);
      
      // Pobierz aktualny plan użytkownika
      const plan = await apiCall(`/plans/${user.plan}`);
      setCurrentPlan(plan);
      
      setView(user.role === 'admin' || user.role === 'owner' ? 'admin' : 'dashboard');
    } catch (err) {
      console.error('Błąd pobierania profilu:', err);
      localStorage.removeItem('token');
      setToken(null);
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError('');
      await apiCall('/register', 'POST', registerData);
      alert('Konto utworzone! Możesz się teraz zalogować.');
      setIsRegister(false);
      setRegisterData({ login: '', password: '', firstName: '', lastName: '' });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiCall('/login', 'POST', loginData);
      
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      
      // Pobierz plan
      const plan = await apiCall(`/plans/${data.user.plan}`);
      setCurrentPlan(plan);
      
      setView(data.user.role === 'admin' || data.user.role === 'owner' ? 'admin' : 'dashboard');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    setView('login');
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

  const finishWorkout = async () => {
    try {
      const workoutData = {
        date: today.toISOString().split('T')[0],
        level: selectedLevel,
        duration: Math.floor(timer / 60),
        hour: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
      };
      
      await apiCall('/workout', 'POST', workoutData);
      await fetchUserProfile(); // Odśwież dane
      
      setWorkoutInProgress(false);
      setView('dashboard');
      alert('Gratulacje! Trening ukończony! 🎉');
    } catch (err) {
      alert('Błąd zapisywania treningu');
    }
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
    if (!date || !currentUser) return null;
    const dateStr = date.toISOString().split('T')[0];
    return currentUser.workoutHistory?.find(w => w.date === dateStr);
  };

  // Admin functions
  const fetchAllUsers = async () => {
    try {
      const users = await apiCall('/admin/users');
      setAllUsers(users);
    } catch (err) {
      console.error('Błąd pobierania użytkowników:', err);
    }
  };

  const fetchAllPlans = async () => {
    try {
      const plans = await apiCall('/plans');
      setAllPlans(plans);
    } catch (err) {
      console.error('Błąd pobierania planów:', err);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const stats = await apiCall('/admin/stats');
      setAdminStats(stats);
    } catch (err) {
      console.error('Błąd pobierania statystyk:', err);
    }
  };

  const handleEditUser = async (userId, updates) => {
    try {
      await apiCall(`/admin/users/${userId}`, 'PUT', updates);
      alert('Użytkownik zaktualizowany!');
      fetchAllUsers();
      setEditingUser(null);
    } catch (err) {
      alert('Błąd aktualizacji użytkownika');
    }
  };

  const handleShowPassword = async (userId) => {
    try {
      const result = await apiCall(`/admin/users/${userId}/show-password`, 'POST', {
        adminPassword: adminPasswordConfirm
      });
      alert(result.message + '\n\n' + result.info);
      setShowPasswordModal(false);
      setAdminPasswordConfirm('');
    } catch (err) {
      alert('Nieprawidłowe hasło administratora');
    }
  };

  const handleResetPassword = async (userId) => {
    try {
      const result = await apiCall(`/admin/users/${userId}/reset-password`, 'POST');
      alert(`Link do resetowania:\n${result.resetLink}`);
    } catch (err) {
      alert('Błąd generowania linku');
    }
  };

  const handleAddPlan = async (planData) => {
    try {
      await apiCall('/admin/plans', 'POST', planData);
      alert('Plan dodany!');
      fetchAllPlans();
      setNewPlanModal(false);
    } catch (err) {
      alert('Błąd dodawania planu');
    }
  };

  useEffect(() => {
    if (view === 'admin' && currentUser) {
      fetchAllUsers();
      fetchAllPlans();
      fetchAdminStats();
    }
  }, [view]);

  // LOGIN VIEW
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="bg-gray-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">FitTracker Pro</h1>
            <p className="text-gray-400">Twój osobisty trener</p>
          </div>
          
          {!isRegister ? (
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
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg disabled:opacity-50"
              >
                {loading ? 'Logowanie...' : 'Zaloguj się'}
              </button>
              <button
                onClick={() => setIsRegister(true)}
                className="w-full bg-gray-700 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-all duration-200"
              >
                Utwórz konto
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Login"
                value={registerData.login}
                onChange={(e) => setRegisterData({...registerData, login: e.target.value})}
                className="w-full bg-gray-700/50 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
              />
              <input
                type="password"
                placeholder="Hasło"
                value={registerData.password}
                onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                className="w-full bg-gray-700/50 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
              />
              <input
                type="text"
                placeholder="Imię"
                value={registerData.firstName}
                onChange={(e) => setRegisterData({...registerData, firstName: e.target.value})}
                className="w-full bg-gray-700/50 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
              />
              <input
                type="text"
                placeholder="Nazwisko"
                value={registerData.lastName}
                onChange={(e) => setRegisterData({...registerData, lastName: e.target.value})}
                className="w-full bg-gray-700/50 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
              />
              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg disabled:opacity-50"
              >
                {loading ? 'Tworzenie...' : 'Zarejestruj się'}
              </button>
              <button
                onClick={() => setIsRegister(false)}
                className="w-full bg-gray-700 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-all duration-200"
              >
                Mam już konto
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ADMIN VIEW
  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">Panel Administracyjny</h1>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Wyloguj
            </button>
          </div>

          {adminStats && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-gray-800/50 backdrop-blur-xl p-4 rounded-xl border border-gray-700">
                <Users className="w-8 h-8 text-blue-400 mb-2" />
                <p className="text-gray-400 text-sm">Użytkownicy</p>
                <p className="text-2xl font-bold text-white">{adminStats.totalUsers}</p>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-xl p-4 rounded-xl border border-gray-700">
                <Key className="w-8 h-8 text-purple-400 mb-2" />
                <p className="text-gray-400 text-sm">Adminowie</p>
                <p className="text-2xl font-bold text-white">{adminStats.totalAdmins}</p>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-xl p-4 rounded-xl border border-gray-700">
                <TrendingUp className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-gray-400 text-sm">Aktywni dziś</p>
                <p className="text-2xl font-bold text-white">{adminStats.activeToday}</p>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-xl p-4 rounded-xl border border-gray-700">
                <CheckCircle className="w-8 h-8 text-orange-400 mb-2" />
                <p className="text-gray-400 text-sm">Treningi</p>
                <p className="text-2xl font-bold text-white">{adminStats.totalWorkouts}</p>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-xl p-4 rounded-xl border border-gray-700">
                <BarChart3 className="w-8 h-8 text-yellow-400 mb-2" />
                <p className="text-gray-400 text-sm">Plany</p>
                <p className="text-2xl font-bold text-white">{adminStats.totalPlans}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-xl border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" /> Zarządzanie Użytkownikami
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {allUsers.filter(u => u.role === 'user').map(user => (
                  <div key={user._id} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <p className="text-gray-400">Login:</p>
                        <p className="text-white font-semibold">{user.login}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Imię i nazwisko:</p>
                        <p className="text-white">{user.firstName} {user.lastName}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Ostatnie logowanie:</p>
                        <p className="text-white text-xs">{user.lastLogin ? new Date(user.lastLogin).toLocaleString('pl-PL') : 'Nigdy'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">IP:</p>
                        <p className="text-white text-xs">{user.lastIP || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-400">Lokalizacja:</p>
                        <p className="text-white text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {user.geoLocation || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={async () => {
                          const userDetails = await apiCall(`/admin/users/${user._id}`);
                          setCurrentUser(userDetails);
                          setView('dashboard');
                        }}
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        <LogIn className="w-4 h-4" /> Zaloguj
                      </button>
                      <button
                        onClick={() => { setSelectedUser(user); setShowPasswordModal(true); }}
                        className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                      >
                        <Eye className="w-4 h-4" /> Hasło
                      </button>
                      <button
                        onClick={() => setEditingUser(user)}
                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        <Edit className="w-4 h-4" /> Edytuj
                      </button>
                      <button
                        onClick={() => handleResetPassword(user._id)}
                        className="flex items-center gap-1 bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700"
                      >
                        <RotateCcw className="w-4 h-4" /> Reset
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-xl border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" /> Zarządzanie Planami
              </h3>
              <button
                onClick={() => setNewPlanModal(true)}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 mb-4"
              >
                + Dodaj nowy plan
              </button>
              <div className="space-y-3">
                {allPlans.map(plan => (
                  <div key={plan._id} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white font-semibold">{plan.name}</p>
                        <p className="text-sm text-gray-400">
                          {plan.isPaid ? `💰 ${plan.price} PLN` : '🆓 Darmowy'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 bg-gray-700/30 p-4 rounded-lg">
                <h4 className="text-white font-semibold mb-2 text-sm">Format JSON dla nowego planu:</h4>
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
                placeholder="Twoje hasło (admin)"
                value={adminPasswordConfirm}
                onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleShowPassword(selectedUser._id)}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Potwierdź
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
                  id="editFirstName"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Nazwisko"
                  defaultValue={editingUser.lastName}
                  id="editLastName"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Login"
                  defaultValue={editingUser.login}
                  id="editLogin"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg"
                />
                <select id="editPlan" defaultValue={editingUser.plan} className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg">
                  {allPlans.map(plan => (
                    <option key={plan._id} value={plan.name}>{plan.name}</option>
                  ))}
                </select>
                <select id="editRole" defaultValue={editingUser.role} className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    handleEditUser(editingUser._id, {
                      firstName: document.getElementById('editFirstName').value,
                      lastName: document.getElementById('editLastName').value,
                      login: document.getElementById('editLogin').value,
                      plan: document.getElementById('editPlan').value,
                      role: document.getElementById('editRole').value
                    });
                  }}
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

        {newPlanModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 p-6 rounded-xl max-w-2xl w-full border border-gray-700 max-h-96 overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-4">Dodaj nowy plan treningowy</h3>
              <textarea
                id="newPlanJSON"
                placeholder="Wklej JSON planu..."
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg mb-4 font-mono text-sm h-64"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    try {
                      const planData = JSON.parse(document.getElementById('newPlanJSON').value);
                      handleAddPlan(planData);
                    } catch (err) {
                      alert('Nieprawidłowy format JSON!');
                    }
                  }}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Dodaj
                </button>
                <button
                  onClick={() => setNewPlanModal(false)}
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

  // WORKOUT VIEW
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

  // STATS VIEW
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
                {currentUser?.workoutHistory?.filter(w => {
                  const workoutDate = new Date(w.date);
                  return workoutDate.getMonth() === currentMonth.getMonth();
                }).length || 0}
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-xl border border-gray-700">
              <Clock className="w-8 h-8 text-blue-400 mb-2" />
              <p className="text-gray-400 text-sm">Łączny czas</p>
              <p className="text-3xl font-bold text-white">
                {currentUser?.workoutHistory?.reduce((sum, w) => sum + w.duration, 0) || 0} min
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-xl border border-gray-700">
              <CheckCircle className="w-8 h-8 text-purple-400 mb-2" />
              <p className="text-gray-400 text-sm">Ukończone treningi</p>
              <p className="text-3xl font-bold text-white">
                {currentUser?.workoutHistory?.filter(w => w.completed).length || 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-xl p-6 rounded-xl border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                Kalendarz - {currentMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
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
                      onClick={() => {
                        if (day) {
                          setSelectedDate(day);
                          setSelectedDateInfo(workout);
                        }
                      }}
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
            </div>

            <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-xl border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Szczegóły dnia</h3>
              {selectedDate && selectedDateInfo ? (
                <div className="space-y-3">
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <h4 className="text-white font-bold mb-3">
                      📅 {selectedDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Level:</span>
                        <span className="text-white capitalize font-semibold">{selectedDateInfo.level}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Czas:</span>
                        <span className="text-white">{selectedDateInfo.duration} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Godzina:</span>
                        <span className="text-white">{selectedDateInfo.hour}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className="text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Ukończono
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedDate && !selectedDateInfo ? (
                <div className="bg-gray-700/50 p-4 rounded-lg text-center">
                  <p className="text-gray-400">📅 {selectedDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}</p>
                  <p className="text-gray-500 mt-2">Brak treningu w tym dniu</p>
                </div>
              ) : (
                <div className="bg-gray-700/30 p-8 rounded-lg text-center">
                  <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">Kliknij na dzień w kalendarzu aby zobaczyć szczegóły</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SETTINGS VIEW
  if (view === 'settings') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">Ustawienia</h1>
            <button
              onClick={() => setView('dashboard')}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Powrót
            </button>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-xl border border-gray-700 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Informacje o koncie</h2>
            <div className="space-y-3">
              <div>
                <p className="text-gray-400 text-sm">Imię i nazwisko</p>
                <p className="text-white font-semibold">{currentUser.firstName} {currentUser.lastName}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Login</p>
                <p className="text-white font-semibold">{currentUser.login}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Rola</p>
                <p className="text-white font-semibold capitalize">{currentUser.role}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-xl border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Zmień plan treningowy</h2>
            <div className="space-y-3">
              {allPlans.map(plan => (
                <button
                  key={plan._id}
                  onClick={async () => {
                    try {
                      await apiCall('/user/profile', 'PUT', { 
                        firstName: currentUser.firstName,
                        lastName: currentUser.lastName,
                        plan: plan.name 
                      });
                      await fetchUserProfile();
                      alert('Plan zmieniony!');
                    } catch (err) {
                      alert('Błąd zmiany planu');
                    }
                  }}
                  disabled={plan.isPaid && currentUser.role === 'user'}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    currentUser.plan === plan.name
                      ? 'bg-blue-600/20 border-blue-500'
                      : plan.isPaid && currentUser.role === 'user'
                      ? 'bg-gray-700/30 border-gray-600 opacity-50 cursor-not-allowed'
                      : 'bg-gray-700/30 border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-semibold">{plan.name}</p>
                      <p className="text-sm text-gray-400">
                        {plan.isPaid ? `💰 ${plan.price} PLN ${currentUser.role === 'user' ? '(Wymagana płatność)' : ''}` : '🆓 Darmowy'}
                      </p>
                    </div>
                    {currentUser.plan === plan.name && (
                      <CheckCircle className="w-6 h-6 text-blue-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD VIEW
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Witaj, {currentUser?.firstName}!</h1>
            <p className="text-gray-400">Plan: {currentUser?.plan}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('settings')}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Ustawienia
            </button>
            {(currentUser?.role === 'admin' || currentUser?.role === 'owner') && (
              <button
                onClick={() => setView('admin')}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                Admin Panel
              </button>
            )}
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Wyloguj
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-xl border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">
              {todayWorkout?.emoji} Dzisiejszy trening
            </h2>
            <h3 className="text-xl text-gray-300 mb-4">{dayNames[today.getDay()]} - {todayWorkout?.name}</h3>
            
            <div className="space-y-3 mb-6">
              {todayWorkout?.exercises.map((ex, idx) => (
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
                {currentUser?.workoutHistory?.slice(-5).reverse().map((w, idx) => (
                  <div key={idx} className="bg-gray-700/30 p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-white font-semibold">{new Date(w.date).toLocaleDateString('pl-PL')}</p>
                      <p className="text-gray-400 text-sm capitalize">{w.level} • {w.duration} min</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                ))}
                {(!currentUser?.workoutHistory || currentUser.workoutHistory.length === 0) && (
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
