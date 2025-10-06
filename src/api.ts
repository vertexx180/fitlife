const API_URL = process.env.REACT_APP_API_URL;

export const login = async (login: string, password: string) => {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password })
  });
  return res.json();
};

export const getWorkouts = async (token: string, date: string) => {
  const res = await fetch(`${API_URL}/api/workouts?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
};

export const updateUser = async (token: string, id: number, data: any) => {
  const res = await fetch(`${API_URL}/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const getStats = async (token: string) => {
  const res = await fetch(`${API_URL}/api/stats`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
};
