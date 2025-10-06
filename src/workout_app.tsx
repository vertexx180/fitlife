import React, { useState, useEffect } from 'react';
import { login, getWorkouts, getStats } from './api';
import Calendar from './components/Calendar';
import WorkoutInfo from './components/WorkoutInfo';
import UserSettings from './components/UserSettings';
import Stats from './components/Stats';

export default function WorkoutApp() {
  const [token, setToken] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [workout, setWorkout] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    getWorkouts(token, selectedDate).then(setWorkout);
  }, [token, selectedDate]);

  useEffect(() => {
    if (!token) return;
    getStats(token).then(setStats);
  }, [token]);

  const handleLogin = async (loginInput: string, password: string) => {
    const res = await login(loginInput, password);
    if (res.token) setToken(res.token);
    else alert('Błąd logowania');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
      {!token ? (
        <div>
          <h2>Logowanie</h2>
          <input id="login" placeholder="login" />
          <input id="password" placeholder="hasło" type="password" />
          <button onClick={() =>
            handleLogin(
              (document.getElementById('login') as HTMLInputElement).value,
              (document.getElementById('password') as HTMLInputElement).value
            )
          }>Zaloguj</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '40px' }}>
          <div>
            <Calendar selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
          </div>
          <div>
            <WorkoutInfo workout={workout} />
            <UserSettings token={token} />
            {stats && <Stats stats={stats} />}
          </div>
        </div>
      )}
    </div>
  );
}
