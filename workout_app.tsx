// W dowolnym miejscu w komponencie
{!token && (
  <div className="register-box">
    <h3>Stwórz konto admina (jednorazowo)</h3>
    <input placeholder="login" value={login} onChange={e => setLogin(e.target.value)} />
    <input placeholder="hasło" type="password" value={password} onChange={e => setPassword(e.target.value)} />
    <button onClick={async () => {
      try {
        const r = await fetch('https://fitlife-gamc.onrender.com/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login, password, role: 'owner' })
        });
        const j = await r.json();
        alert(r.ok ? 'Konto stworzone!' : 'Błąd: ' + j.error);
      } catch(e) { console.error(e); alert('Błąd sieci'); }
    }}>Stwórz admina</button>
  </div>
)}
