import React, { useState, useEffect } from 'react';
import { updateUser } from '../api';

interface UserSettingsProps {
  token: string;
}

export default function UserSettings({ token }: UserSettingsProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [plan, setPlan] = useState('Starter');
  const [role, setRole] = useState('user');

  const handleSave = async () => {
    await updateUser(token, 1, { firstName, lastName, plan, role });
    alert('Zapisano zmiany');
  };

  return (
    <div>
      <h3>Ustawienia konta</h3>
      <input placeholder="Imię" value={firstName} onChange={e => setFirstName(e.target.value)} />
      <input placeholder="Nazwisko" value={lastName} onChange={e => setLastName(e.target.value)} />
      <input placeholder="Plan" value={plan} onChange={e => setPlan(e.target.value)} />
      <select value={role} onChange={e => setRole(e.target.value)}>
        <option value="user">user</option>
        <option value="admin">admin</option>
        <option value="owner">owner</option>
      </select>
      <button onClick={handleSave}>Zapisz</button>
    </div>
  );
}
