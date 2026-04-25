import React, { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';
import { LogOut, History, PlusCircle, BookOpen, Briefcase, GraduationCap } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  // App State
  const [view, setView] = useState('new'); // 'new' or 'history'
  
  // Form Data
  const [formData, setFormData] = useState({ 
    age: '', 
    education: '', 
    currentWork: '',
    domain: '',
    interest: '' 
  });
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // History Data
  const [historyItems, setHistoryItems] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setRoadmap(null);
      setView('new');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const fetchHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, "roadmaps"), 
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const items = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setHistoryItems(items);
    } catch (error) {
      console.error("Error fetching history:", error);
      // Fallback if index is not created yet
      if(error.code === 'failed-precondition') {
          console.log("Requires Firestore Index. Fetching without orderBy");
          const q2 = query(collection(db, "roadmaps"), where("userId", "==", user.uid));
          const snap2 = await getDocs(q2);
          const items2 = [];
          snap2.forEach((doc) => items2.push({ id: doc.id, ...doc.data() }));
          items2.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
          setHistoryItems(items2);
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleViewChange = (newView) => {
    setView(newView);
    if (newView === 'history') {
      fetchHistory();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRoadmap(null);

    try {
      const response = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: formData.age,
          education: formData.education,
          interest: formData.interest
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate roadmap');
      }
      
      const generatedRoadmap = data.roadmap;
      setRoadmap(generatedRoadmap);

      // Save to Firebase
      if (user) {
        await addDoc(collection(db, "roadmaps"), {
          userId: user.uid,
          formData: formData,
          roadmap: generatedRoadmap,
          createdAt: new Date().toISOString()
        });
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingAuth) {
    return (
      <div className="container loader-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="landing-page">
        <div className="landing-content">
          <div className="landing-badge">✨ Transform your journey</div>
          <h1 className="landing-title">Learning Companion<br/><span className="highlight">AI Powered Assistant</span></h1>
          <p className="landing-subtitle">Generate hyper-personalized learning roadmaps tailored to your age, education, and career goals. Track your progress dynamically over time.</p>
          
          <div className="landing-features">
            <div className="feature"><span className="feature-icon">🎯</span> Custom Roadmaps</div>
            <div className="feature"><span className="feature-icon">📈</span> Progress Tracking</div>
            <div className="feature"><span className="feature-icon">🧠</span> AI Intelligence</div>
          </div>

          <button onClick={handleLogin} className="btn-google-signin">
             <div className="google-icon-wrapper">
               <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google Logo" className="google-logo" />
             </div>
             <span className="btn-text">Sign in with Google</span>
          </button>
        </div>
        <div className="landing-visual">
          <div className="glass-panel">
            <div className="skeleton-line w-3-4"></div>
            <div className="skeleton-line w-full"></div>
            <div className="skeleton-line w-5-6"></div>
            <div className="pulse-circle"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="app-header">
        <div className="user-info">
          <img src={user.photoURL || 'https://via.placeholder.com/40'} alt="Profile" className="profile-pic" />
          <div>
            <h2 className="greeting">Welcome, {user.displayName}</h2>
            <p className="user-email">{user.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-icon">
          <LogOut size={18} /> Sign Out
        </button>
      </header>

      <nav className="nav-tabs">
        <button 
          className={`tab-btn ${view === 'new' ? 'active' : ''}`}
          onClick={() => handleViewChange('new')}
        >
          <PlusCircle size={18} /> New Roadmap
        </button>
        <button 
          className={`tab-btn ${view === 'history' ? 'active' : ''}`}
          onClick={() => handleViewChange('history')}
        >
          <History size={18} /> My History
        </button>
      </nav>

      {view === 'new' && (
        <>
          <div className="header">
            <h1 className="title">Design Your Path</h1>
            <p className="subtitle">Tell us about yourself to get a tailored learning roadmap.</p>
          </div>

          <form className="form-card grid-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="age">Age</label>
              <input type="number" id="age" name="age" className="form-input" placeholder="e.g., 25" value={formData.age} onChange={handleChange} required />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="education">Education Level</label>
              <select id="education" name="education" className="form-select" value={formData.education} onChange={handleChange} required>
                <option value="" disabled>Select education</option>
                <option value="High School">High School</option>
                <option value="Undergraduate">Undergraduate</option>
                <option value="Graduate">Graduate</option>
                <option value="Professional">Professional</option>
                <option value="Self-Taught">Self-Taught</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="currentWork">Current Work</label>
              <input type="text" id="currentWork" name="currentWork" className="form-input" placeholder="e.g., Software Engineer, Student" value={formData.currentWork} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="domain">Domain/Industry</label>
              <input type="text" id="domain" name="domain" className="form-input" placeholder="e.g., Tech, Finance, Healthcare" value={formData.domain} onChange={handleChange} required />
            </div>

            <div className="form-group full-width">
              <label className="form-label" htmlFor="interest">What do you want to learn?</label>
              <input type="text" id="interest" name="interest" className="form-input" placeholder="e.g., Quantum Computing, React Native, Digital Marketing" value={formData.interest} onChange={handleChange} required />
            </div>

            <div className="full-width">
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Generating...' : 'Generate AI Roadmap'}
              </button>
            </div>
            
            {error && <p style={{ color: '#ef4444', marginTop: '15px', textAlign: 'center' }} className="full-width">{error}</p>}
          </form>

          {loading && (
            <div className="loader">
              <div className="spinner"></div>
            </div>
          )}

          {roadmap && !loading && (
            <div className="timeline">
              {roadmap.map((milestone, index) => (
                <div className="timeline-item" key={index}>
                  <div className="timeline-dot active"></div>
                  <div className="timeline-content">
                    <div className="timeline-duration">{milestone.duration}</div>
                    <h3 className="timeline-title">{milestone.title}</h3>
                    <p className="timeline-desc">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'history' && (
        <div className="history-view">
           <div className="header">
             <h1 className="title" style={{fontSize: '2.5rem'}}>Your Learning Journey</h1>
             <p className="subtitle">A track record of your interests over time.</p>
           </div>
           
           {loadingHistory ? (
             <div className="loader"><div className="spinner"></div></div>
           ) : historyItems.length === 0 ? (
             <div className="empty-state">
               <History size={48} color="var(--text-muted)" style={{opacity: 0.5, marginBottom: '20px'}} />
               <p style={{color: 'var(--text-muted)'}}>No roadmaps generated yet. Create one to see it here!</p>
             </div>
           ) : (
             <div className="history-grid">
               {historyItems.map(item => (
                 <div key={item.id} className="history-card form-card">
                    <div className="history-card-header">
                      <h3>{item.formData.interest}</h3>
                      <span className="date-badge">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="history-meta" style={{display: 'flex', gap: '15px', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '15px'}}>
                      <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}><Briefcase size={14}/> {item.formData.currentWork}</span>
                      <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}><GraduationCap size={14}/> {item.formData.education}</span>
                    </div>
                    <div className="history-roadmap-preview" style={{borderTop: '1px solid var(--border-color)', paddingTop: '15px'}}>
                       {item.roadmap.slice(0, 2).map((m, i) => (
                         <div key={i} className="preview-item" style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px'}}>
                           <div className="preview-dot" style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-color)'}}></div>
                           <span style={{fontSize: '0.95rem'}}>{m.title}</span>
                         </div>
                       ))}
                       {item.roadmap.length > 2 && <div className="preview-more" style={{fontSize: '0.85rem', color: 'var(--secondary-color)', marginTop: '10px'}}>+ {item.roadmap.length - 2} more steps</div>}
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      )}
    </div>
  );
}

export default App;
