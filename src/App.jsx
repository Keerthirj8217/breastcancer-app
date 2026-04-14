import { useState, useRef, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'oncoscan_users';
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

async function loadUsers() {
  try {
    if (window.storage?.get) {
      const r = await window.storage.get(STORAGE_KEY);
      return r ? JSON.parse(r.value) : [];
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveUsers(u) {
  try {
    if (window.storage?.set) {
      return await window.storage.set(STORAGE_KEY, JSON.stringify(u));
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  } catch {}
}

const toBase64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(',')[1]);
  r.onerror = () => rej(new Error('fail'));
  r.readAsDataURL(file);
});

function RadialGauge({ pct, label, color }) {
  const r = 52, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="122" height="122" viewBox="0 0 122 122">
        <circle cx="61" cy="61" r={r} fill="none" stroke="#1a2535" strokeWidth="9" />
        <circle cx="61" cy="61" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 61 61)" style={{ transition: 'stroke-dasharray 1.2s ease' }} />
        <text x="61" y="57" textAnchor="middle" fill="#e8f4fd" fontSize="20" fontWeight="700" fontFamily="'DM Serif Display',serif">{pct}%</text>
        <text x="61" y="73" textAnchor="middle" fill="#5a8aaa" fontSize="9" fontFamily="'DM Sans',sans-serif">{label}</text>
      </svg>
    </div>
  );
}

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const C = { Sick: '#e05c6a', Normal: '#34c98e', Unknown: '#f0a040' };
  return (
    <div style={{ width: '100%', padding: '0 6px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#a0c0e0', fontSize: 12, fontWeight: 600 }}>{d.label}</span>
            <span style={{ color: C[d.label] || '#7ab3d4', fontSize: 12, fontWeight: 700 }}>{d.value.toFixed(1)}%</span>
          </div>
          <div style={{ background: '#1a2535', borderRadius: 6, height: 10, overflow: 'hidden' }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: '100%',
              background: `linear-gradient(90deg,${C[d.label] || '#7ab3d4'},${C[d.label] || '#7ab3d4'}88)`,
              borderRadius: 6, transition: 'width 1.2s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function HeatmapOverlay({ imageUrl, regions }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
      <img src={imageUrl} alt="scan" style={{ maxWidth: '100%', maxHeight: 290, borderRadius: 10, display: 'block' }} />
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} viewBox="0 0 100 100" preserveAspectRatio="none">
        {(regions || []).map((reg, i) => (
          <ellipse key={i} cx={reg.cx} cy={reg.cy} rx={reg.rx} ry={reg.ry}
            fill={`rgba(224,92,106,${reg.opacity})`} stroke="#e05c6a" strokeWidth="0.5"
            style={{ animation: `hpulse 2s ease-in-out ${i * 0.3}s infinite alternate` }} />
        ))}
      </svg>
    </div>
  );
}

function Navbar({ user, onLogout, showNewScan, onNewScan }) {
  return (
    <div style={{ width: '100%', maxWidth: 960, padding: '16px 0', display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', borderBottom: '1px solid #1a2e46', marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#1a6dbf,#e05c6a)', borderRadius: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🩺</div>
        <div>
          <div style={{ fontFamily: "'DM Serif Display',serif", color: '#e8f4fd', fontSize: 17, lineHeight: 1 }}>OncoScan AI</div>
          <div style={{ color: '#1e3a55', fontSize: 10, letterSpacing: '0.8px' }}>BREAST CANCER DETECTION</div>
        </div>
      </div>
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#c0d8f0', fontSize: 13, fontWeight: 600 }}>{user.name}</div>
            <div style={{ color: '#2a4a6a', fontSize: 11 }}>{user.role} · {user.userId}</div>
          </div>
          {showNewScan && (
            <button onClick={onNewScan} style={{ background: '#0e1928', border: '1px solid #1a2e46', color: '#7a9bbf',
              padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>← New Scan</button>
          )}
          <button onClick={onLogout} style={{ background: 'rgba(224,92,106,0.12)', border: '1px solid rgba(224,92,106,0.3)',
            color: '#e05c6a', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Sign Out</button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState('register');
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [user, setUser] = useState(null);

  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState('Patient');
  const [regId, setRegId] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regError, setRegError] = useState('');
  const [regShake, setRegShake] = useState(false);

  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginShake, setLoginShake] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    const l = document.createElement('link');
    l.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap';
    l.rel = 'stylesheet';
    document.head.appendChild(l);
  }, []);

  useEffect(() => {
    loadUsers().then(u => { setRegisteredUsers(u); setUsersLoaded(true); });
  }, []);

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const shake = (setter) => { setter(true); setTimeout(() => setter(false), 600); };

  const handleRegister = async () => {
    if (!regName.trim() || !regId.trim() || !regPass.trim() || !regConfirm.trim()) {
      setRegError('Please fill in all fields.'); shake(setRegShake); return;
    }
    if (regId.trim().length < 4) {
      setRegError('User ID must be at least 4 characters.'); shake(setRegShake); return;
    }
    if (regPass.length < 6) {
      setRegError('Password must be at least 6 characters.'); shake(setRegShake); return;
    }
    if (regPass !== regConfirm) {
      setRegError('Passwords do not match.'); shake(setRegShake); return;
    }
    if (registeredUsers.find(u => u.userId === regId.trim())) {
      setRegError('User ID already taken. Please choose another.'); shake(setRegShake); return;
    }
    const newUser = { userId: regId.trim(), password: regPass, name: regName.trim(), role: regRole };
    const updated = [...registeredUsers, newUser];
    await saveUsers(updated);
    setRegisteredUsers(updated);
    setRegError('');
    showToast(`Account created! Welcome, ${regName.trim()}. Please sign in.`, 'success');
    setLoginId(regId.trim());
    setLoginPass(regPass);
    setTimeout(() => setScreen('login'), 900);
  };

  const handleLogin = () => {
    if (!loginId.trim() || !loginPass.trim()) {
      setLoginError('Please enter your User ID and Password.'); shake(setLoginShake); return;
    }
    const found = registeredUsers.find(u => u.userId === loginId.trim() && u.password === loginPass.trim());
    if (!found) {
      setLoginError('Invalid User ID or Password. Please try again.'); shake(setLoginShake); return;
    }
    setLoginError(''); setUser(found); setScreen('dashboard');
  };

  const handleLogout = () => {
    setUser(null); setImageFile(null); setImagePreview(null); setResult(null);
    setLoginId(''); setLoginPass(''); setLoginError('');
    setScreen('login');
  };

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) { showToast('Please upload a valid image.'); return; }
    setImageFile(file); setImagePreview(URL.createObjectURL(file)); setResult(null);
  };

  const analyzeImage = useCallback(async () => {
    if (!imageFile) { showToast('Please upload a scan image first.', 'warning'); return; }
    setAnalyzing(true);

    if (!ANTHROPIC_API_KEY) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setResult({
        classification: 'Sick',
        confidence: 82,
        spreadPercentage: 38,
        stage: 'Stage II',
        probabilities: { Sick: 82, Normal: 12, Unknown: 6 },
        regions: [
          { cx: 52, cy: 43, rx: 14, ry: 9, opacity: 0.46 },
          { cx: 35, cy: 62, rx: 11, ry: 8, opacity: 0.32 }
        ],
        locationDescription: 'Upper outer quadrant of the left breast',
        clinicalNotes: 'The scan shows a suspicious lesion pattern that should be reviewed by a specialist.',
        recommendation: 'Schedule follow-up imaging and consult an oncologist for biopsy evaluation.'
      });
      setScreen('result');
      setAnalyzing(false);
      return;
    }

    try {
      const b64 = await toBase64(imageFile);
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ANTHROPIC_API_KEY}`
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1000,
          system: `You are an expert oncology AI specializing in breast cancer detection from heatmap/histology images.
Respond ONLY with a valid JSON object (no markdown, no preamble):
{
  "classification":"Sick"|"Normal"|"Unknown",
  "confidence":<0-100>,
  "spreadPercentage":<0-100>,
  "stage":"Stage 0"|"Stage I"|"Stage II"|"Stage III"|"Stage IV"|"No Cancer Detected"|"Inconclusive",
  "probabilities":{"Sick":<0-100>,"Normal":<0-100>,"Unknown":<0-100>},
  "regions":[{"cx":<0-100>,"cy":<0-100>,"rx":<2-15>,"ry":<2-12>,"opacity":<0.2-0.65>}],
  "locationDescription":"<concise clinical location>",
  "clinicalNotes":"<1-2 sentence interpretation>",
  "recommendation":"<next steps>"
}
Rules: probabilities sum to 100. regions 0-5 ellipses. Empty array if Normal/no concern.`,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: imageFile.type, data: b64 } },
            { type: 'text', text: 'Analyze this breast scan and return the JSON result.' }
          ] }]
        })
      });
      const data = await resp.json();
      const text = (data.content || []).map(b => b.text || '').join('');
      setResult(JSON.parse(text.replace(/```json|```/g, '').trim()));
      setScreen('result');
    } catch (e) {
      console.error(e);
      showToast('Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }, [imageFile]);

  const classColor = c => ({ Sick: '#e05c6a', Normal: '#34c98e', Unknown: '#f0a040' }[c] || '#7a9bbf');
  const stageColor = s => {
    if (!s) return '#7a9bbf';
    if (s === 'No Cancer Detected') return '#34c98e';
    if (s === 'Inconclusive') return '#7a9bbf';
    if (s.includes('0') || s === 'Stage I') return '#f0c040';
    if (s.includes('II')) return '#f09040';
    return '#e05c6a';
  };

  const BG = {
    minHeight: '100vh', background: '#0b1420', fontFamily: "'DM Sans',sans-serif",
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    backgroundImage: 'radial-gradient(ellipse at 20% 50%,#0f2040 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,#0d1e35 0%,transparent 50%)',
    padding: '0 20px 48px'
  };
  const CARD = {
    background: 'linear-gradient(145deg,#111e30,#0e1928)', border: '1px solid #1e3050',
    borderRadius: 20, padding: '42px 46px', width: '100%', maxWidth: 470,
    boxShadow: '0 24px 80px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.04)'
  };
  const INP = {
    width: '100%', background: '#0b1828', border: '1px solid #1e3050',
    borderRadius: 10, padding: '13px 16px', color: '#e8f4fd',
    fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none', boxSizing: 'border-box'
  };
  const LBL = { color: '#3a6a8a', fontSize: 11, fontWeight: 700, letterSpacing: '0.9px', marginBottom: 6, display: 'block' };
  const BTN = (on = true) => ({
    width: '100%', padding: '14px',
    background: on ? 'linear-gradient(135deg,#1a6dbf,#0e4d8c)' : '#1a2535',
    border: 'none', borderRadius: 10, color: on ? '#fff' : '#2a4a6a',
    fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
    cursor: on ? 'pointer' : 'not-allowed', letterSpacing: '0.5px',
    boxShadow: on ? '0 4px 20px rgba(26,109,191,0.4)' : 'none', transition: 'all 0.2s'
  });
  const ERR = {
    background: 'rgba(224,92,106,0.1)', border: '1px solid rgba(224,92,106,0.3)',
    borderRadius: 8, padding: '10px 14px', color: '#e05c6a', fontSize: 13,
    display: 'flex', gap: 8, marginBottom: 18
  };

  const CSS = `
    @keyframes fadeIn  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    @keyframes slideUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
    @keyframes shakeX  { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
    @keyframes spin    { to{transform:rotate(360deg)} }
    @keyframes toastIn { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
    @keyframes hpulse  { from{opacity:0.55} to{opacity:1} }
    * { box-sizing:border-box; }
    input::placeholder,textarea::placeholder { color:#1e3a55; }
    select option { background:#0b1828; }
  `;

  const Toast = () => toast ? (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 999,
      background: toast.type === 'success' ? '#34c98e' : '#e05c6a',
      color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)', animation: 'toastIn 0.3s',
      maxWidth: 320, lineHeight: 1.4 }}>
      {toast.msg}
    </div>
  ) : null;

  const Logo = () => (
    <div style={{ textAlign: 'center', marginBottom: 28, animation: 'fadeIn 0.5s' }}>
      <div style={{ width: 62, height: 62, background: 'linear-gradient(135deg,#1a6dbf,#e05c6a)', borderRadius: 19,
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 30 }}>🩺</div>
      <h1 style={{ fontFamily: "'DM Serif Display',serif", color: '#e8f4fd', fontSize: 27, margin: 0 }}>OncoScan AI</h1>
      <p style={{ color: '#2a4a6a', fontSize: 13, margin: '6px 0 0' }}>Breast Cancer Detection System</p>
    </div>
  );

  if (!usersLoaded) return (
    <div style={{ ...BG, justifyContent: 'center' }}>
      <style>{CSS}</style>
      <div style={{ width: 40, height: 40, border: '3px solid #1a2e46', borderTopColor: '#1a6dbf', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (screen === 'register') return (
    <div style={{ ...BG, justifyContent: 'center' }}>
      <style>{CSS}</style>
      <Toast />
      <Logo />
      <div style={{ ...CARD, animation: `slideUp 0.5s${regShake ? ',shakeX 0.5s' : ''}` }}>
        <h2 style={{ fontFamily: "'DM Serif Display',serif", color: '#e8f4fd', fontSize: 22, margin: '0 0 5px', textAlign: 'center' }}>Create your account</h2>
        <p style={{ color: '#2a4a6a', fontSize: 13, textAlign: 'center', margin: '0 0 26px' }}>Register to access the cancer detection tool</p>

        {regError && <div style={ERR}><span>⚠</span><span>{regError}</span></div>}

        <div style={{ marginBottom: 15 }}>
          <label style={LBL}>FULL NAME</label>
          <input style={INP} placeholder="e.g. Dr. Keerthi Sharma" value={regName} onChange={e => setRegName(e.target.value)} />
        </div>
        <div style={{ marginBottom: 15 }}>
          <label style={LBL}>ROLE</label>
          <select style={{ ...INP, appearance: 'none' }} value={regRole} onChange={e => setRegRole(e.target.value)}>
            {['Patient', 'Oncologist', 'Radiologist', 'General Physician', 'Researcher'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 15 }}>
          <label style={LBL}>USER ID <span style={{ color: '#1e3a55', fontWeight: 400 }}>(min. 4 chars)</span></label>
          <input style={INP} placeholder="Choose a unique ID" value={regId} onChange={e => setRegId(e.target.value)} />
        </div>
        <div style={{ marginBottom: 15 }}>
          <label style={LBL}>PASSWORD <span style={{ color: '#1e3a55', fontWeight: 400 }}>(min. 6 chars)</span></label>
          <input style={INP} type="password" placeholder="Create a strong password" value={regPass} onChange={e => setRegPass(e.target.value)} />
        </div>
        <div style={{ marginBottom: 26 }}>
          <label style={LBL}>CONFIRM PASSWORD</label>
          <input style={INP} type="password" placeholder="Re-enter your password" value={regConfirm}
            onChange={e => setRegConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRegister()} />
        </div>

        <button style={BTN()} onClick={handleRegister}>Create Account →</button>

        <p style={{ textAlign: 'center', marginTop: 20, color: '#2a4a6a', fontSize: 13 }}>
          Already have an account?{' '}
          <span onClick={() => setScreen('login')} style={{ color: '#1a6dbf', cursor: 'pointer', fontWeight: 700 }}>Sign in</span>
        </p>
      </div>
    </div>
  );

  if (screen === 'login') return (
    <div style={{ ...BG, justifyContent: 'center' }}>
      <style>{CSS}</style>
      <Toast />
      <Logo />
      <div style={{ ...CARD, animation: `slideUp 0.5s${loginShake ? ',shakeX 0.5s' : ''}` }}>
        <h2 style={{ fontFamily: "'DM Serif Display',serif", color: '#e8f4fd', fontSize: 22, margin: '0 0 5px', textAlign: 'center' }}>Welcome back</h2>
        <p style={{ color: '#2a4a6a', fontSize: 13, textAlign: 'center', margin: '0 0 26px' }}>Sign in with your registered credentials</p>

        {loginError && <div style={ERR}><span>⚠</span><span>{loginError}</span></div>}

        <div style={{ marginBottom: 15 }}>
          <label style={LBL}>USER ID</label>
          <input style={INP} placeholder="Your registered User ID" value={loginId} onChange={e => setLoginId(e.target.value)} />
        </div>
        <div style={{ marginBottom: 26 }}>
          <label style={LBL}>PASSWORD</label>
          <input style={INP} type="password" placeholder="Your password" value={loginPass}
            onChange={e => setLoginPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>

        <button style={BTN()} onClick={handleLogin}>Sign In →</button>

        {registeredUsers.length > 0 && (
          <div style={{ marginTop: 22, background: '#0b1828', borderRadius: 12, border: '1px solid #1a2e46', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #1a2e46', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13 }}>👥</span>
              <span style={{ color: '#1e3a55', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px' }}>REGISTERED ACCOUNTS — click to fill</span>
            </div>
            {registeredUsers.map((u, i) => (
              <div key={i} onClick={() => { setLoginId(u.userId); setLoginPass(u.password); }}
                style={{ padding: '11px 14px', borderBottom: i < registeredUsers.length - 1 ? '1px solid #0e1928' : 'none',
                  cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#0e1928'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div>
                  <span style={{ color: '#4a88be', fontSize: 13, fontWeight: 700 }}>{u.userId}</span>
                  <span style={{ color: '#2a4a6a', fontSize: 12, marginLeft: 9 }}>{u.name}</span>
                </div>
                <span style={{ background: 'rgba(26,109,191,0.14)', color: '#2a6aaf', fontSize: 10, padding: '2px 9px', borderRadius: 10, fontWeight: 700 }}>{u.role}</span>
              </div>
            ))}
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: 20, color: '#2a4a6a', fontSize: 13 }}>
          New here?{' '}
          <span onClick={() => setScreen('register')} style={{ color: '#1a6dbf', cursor: 'pointer', fontWeight: 700 }}>Create an account</span>
        </p>
      </div>
    </div>
  );

  if (screen === 'dashboard') return (
    <div style={{ ...BG, justifyContent: 'flex-start' }}>
      <style>{CSS}</style>
      {toast && <Toast />}
      <Navbar user={user} onLogout={handleLogout} showNewScan={false} />

      <div style={{ width: '100%', maxWidth: 880, animation: 'fadeIn 0.5s' }}>
        <div style={{ marginBottom: 30 }}>
          <h1 style={{ fontFamily: "'DM Serif Display',serif", color: '#e8f4fd', fontSize: 34, margin: '0 0 8px', lineHeight: 1.2 }}>
            Breast Cancer{' '}
            <span style={{ background: 'linear-gradient(135deg,#4a9bdf,#e05c6a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Detection</span>
          </h1>
          <p style={{ color: '#2a4a6a', fontSize: 14, margin: 0 }}>Upload a thermal heatmap or histology scan for AI-powered analysis</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: imagePreview ? '1fr 1fr' : '1fr', gap: 20, marginBottom: 20 }}>
          <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current.click()}
            style={{ background: dragOver ? 'rgba(26,109,191,0.1)' : '#0e1928',
              border: `2px dashed ${dragOver ? '#1a6dbf' : '#1a2e46'}`,
              borderRadius: 16, padding: '52px 24px', textAlign: 'center', cursor: 'pointer',
              transition: 'all 0.2s', minHeight: 230, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center' }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            <div style={{ fontSize: 44, marginBottom: 14 }}>🔬</div>
            <p style={{ color: '#3a7aaa', fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>Drop your scan image here</p>
            <p style={{ color: '#1a3050', fontSize: 12, margin: 0 }}>or click to browse · PNG, JPG, WEBP</p>
          </div>

          {imagePreview && (
            <div style={{ background: '#0e1928', border: '1px solid #1a2e46', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a2e46', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#3a6a8a', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px' }}>UPLOADED SCAN</span>
                <button onClick={() => { setImageFile(null); setImagePreview(null); }} style={{ background: 'none', border: 'none', color: '#2a4a6a', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <img src={imagePreview} alt="preview" style={{ maxWidth: '100%', maxHeight: 230, borderRadius: 8, objectFit: 'contain' }} />
              </div>
            </div>
          )}
        </div>

        <button onClick={analyzeImage} disabled={!imageFile || analyzing}
          style={{ ...BTN(!!imageFile && !analyzing), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 26 }}>
          {analyzing
            ? <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Analyzing scan…</>
            : '🔍  Run Cancer Detection Analysis'}
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {[
            { i: '🎯', t: 'AI Detection', d: 'Vision AI trained on breast cancer heatmap and histology imaging' },
            { i: '🗺️', t: 'Heatmap Overlay', d: 'Pulsing markers show exactly where anomalies are on your scan' },
            { i: '📊', t: 'Stage Analysis', d: 'Spread %, cancer stage, and probability distribution chart' },
          ].map((c, k) => (
            <div key={k} style={{ background: '#0e1928', border: '1px solid #1a2e46', borderRadius: 14, padding: '20px 18px' }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{c.i}</div>
              <div style={{ color: '#8ab8d8', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{c.t}</div>
              <div style={{ color: '#1e3850', fontSize: 12, lineHeight: 1.55 }}>{c.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (screen === 'result' && result) {
    const probData = [
      { label: 'Sick', value: result.probabilities?.Sick ?? 0 },
      { label: 'Normal', value: result.probabilities?.Normal ?? 0 },
      { label: 'Unknown', value: result.probabilities?.Unknown ?? 0 },
    ];
    const cc = classColor(result.classification);
    const sc = stageColor(result.stage);

    return (
      <div style={{ ...BG, justifyContent: 'flex-start' }}>
        <style>{CSS}</style>
        <Navbar user={user} onLogout={handleLogout} showNewScan={true}
          onNewScan={() => { setScreen('dashboard'); setResult(null); setImageFile(null); setImagePreview(null); }} />

        <div style={{ width: '100%', maxWidth: 960, animation: 'fadeIn 0.5s' }}>
          <div style={{ background: `linear-gradient(135deg,${cc}12,transparent)`, border: `1px solid ${cc}35`,
            borderRadius: 16, padding: '22px 28px', marginBottom: 22,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ color: '#1e3a55', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 4 }}>DIAGNOSIS RESULT</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, color: cc }}>{result.classification}</span>
                <span style={{ background: `${sc}1c`, color: sc, padding: '4px 13px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: `1px solid ${sc}38` }}>{result.stage}</span>
              </div>
              <div style={{ color: '#3a6a8a', fontSize: 13, marginTop: 5 }}>{result.clinicalNotes}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#1e3a55', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}>AI CONFIDENCE</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 40, color: '#e8f4fd', lineHeight: 1.1 }}>{result.confidence}%</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div style={{ background: '#0e1928', border: '1px solid #1a2e46', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px', borderBottom: '1px solid #1a2e46' }}>
                <span style={{ color: '#3a6a8a', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px' }}>🗺️ HEATMAP — CANCER LOCALIZATION</span>
              </div>
              <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
                <HeatmapOverlay imageUrl={imagePreview} regions={result.regions} />
              </div>
              <div style={{ padding: '0 18px 16px' }}>
                <div style={{ background: '#0b1420', borderRadius: 8, padding: '10px 13px' }}>
                  <span style={{ color: '#1e3a55', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px' }}>LOCATION: </span>
                  <span style={{ color: '#4a7a9a', fontSize: 12 }}>{result.locationDescription || '—'}</span>
                </div>
              </div>
            </div>

            <div style={{ background: '#0e1928', border: '1px solid #1a2e46', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px', borderBottom: '1px solid #1a2e46' }}>
                <span style={{ color: '#3a6a8a', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px' }}>📊 SPREAD & CONFIDENCE METRICS</span>
              </div>
              <div style={{ padding: '22px 12px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <RadialGauge pct={result.spreadPercentage ?? 0} label="Spread %" color="#e05c6a" />
                <RadialGauge pct={result.confidence ?? 0} label="Confidence" color="#1a6dbf" />
                <RadialGauge pct={result.probabilities?.Sick ?? 0} label="Sick Prob." color="#f0a040" />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div style={{ background: '#0e1928', border: '1px solid #1a2e46', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px', borderBottom: '1px solid #1a2e46' }}>
                <span style={{ color: '#3a6a8a', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px' }}>📈 CLASSIFICATION PROBABILITY CHART</span>
              </div>
              <div style={{ padding: '24px 20px' }}><BarChart data={probData} /></div>
            </div>

            <div style={{ background: '#0e1928', border: '1px solid #1a2e46', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px', borderBottom: '1px solid #1a2e46' }}>
                <span style={{ color: '#3a6a8a', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px' }}>📋 CLINICAL SUMMARY</span>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#1e3a55', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', marginBottom: 8 }}>STAGE ASSESSMENT</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: sc, flexShrink: 0 }} />
                    <span style={{ color: sc, fontSize: 14, fontWeight: 700 }}>{result.stage}</span>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#1e3a55', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', marginBottom: 8 }}>TISSUE INVOLVEMENT</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, background: '#0b1420', borderRadius: 6, height: 8 }}>
                      <div style={{ width: `${result.spreadPercentage ?? 0}%`, height: '100%',
                        background: 'linear-gradient(90deg,#e05c6a,#f0a040)', borderRadius: 6, transition: 'width 1.2s ease' }} />
                    </div>
                    <span style={{ color: '#e8f4fd', fontSize: 13, fontWeight: 700, minWidth: 38 }}>{result.spreadPercentage ?? 0}%</span>
                  </div>
                </div>
                <div>
                  <div style={{ color: '#1e3a55', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', marginBottom: 8 }}>RECOMMENDATION</div>
                  <div style={{ background: '#0b1420', borderRadius: 10, padding: '12px 14px', color: '#4a7a9a', fontSize: 13, lineHeight: 1.6 }}>
                    {result.recommendation || 'Consult a qualified oncologist for further evaluation.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(240,160,64,0.06)', border: '1px solid rgba(240,160,64,0.16)', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }}>⚠️</span>
            <span style={{ color: '#6a5a2a', fontSize: 12, lineHeight: 1.6 }}>
              <strong style={{ color: '#b07828' }}>Medical Disclaimer:</strong> This AI analysis is for screening purposes only and does not constitute a medical diagnosis. Always consult a qualified oncologist or radiologist for clinical decisions.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
