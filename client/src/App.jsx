import React, { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { LogOut, History, PlusCircle, BookOpen, Briefcase, GraduationCap, Info, Download, Trash2 } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  // App State
  const [view, setView] = useState('new'); // 'new' or 'history'
  
  const [formData, setFormData] = useState({ 
    age: '', 
    education: '', 
    currentWork: '',
    domain: '',
    interest: '',
    weeks: ''
  });
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);

  const [historyItems, setHistoryItems] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [error, setError] = useState(null);

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
      const token = await user.getIdToken();
      const response = await fetch('/api/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setHistoryItems(data.history || []);
      } else {
        console.error("Failed to fetch history:", data.error);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const downloadRoadmap = (roadmapData) => {
    if (!roadmapData) return;
    let text = `# My AI Learning Roadmap\n\n`;
    roadmapData.forEach(m => {
      text += `## ${m.duration}: ${m.title}\n`;
      text += `${m.description}\n\n`;
    });
    
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learning-roadmap-${new Date().getTime()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownload = () => downloadRoadmap(roadmap);

  const handleDeleteItem = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this roadmap?')) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/history/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setHistoryItems(prev => prev.filter(item => item.id !== id));
      } else {
        alert("Failed to delete item. Security check failed.");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting roadmap.");
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear ALL your learning history? This cannot be undone.')) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setHistoryItems([]);
      } else {
        alert("Failed to clear history. Security check failed.");
      }
    } catch (e) {
      console.error(e);
      alert("Error clearing history.");
    }
  };

  const handleViewChange = (newView) => {
    setView(newView);
    setSelectedHistoryItem(null); // Reset detail view when changing tabs
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
      const token = await user.getIdToken();
      const response = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          age: formData.age,
          education: formData.education,
          currentWork: formData.currentWork,
          domain: formData.domain,
          interest: formData.interest,
          weeks: formData.weeks
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate roadmap');
      }
      
      const generatedRoadmap = data.roadmap;
      setRoadmap(generatedRoadmap);
      // Backend now handles saving to Firestore!

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
        <button onClick={handleLogout} className="btn-icon" aria-label="Sign Out">
          <LogOut size={18} aria-hidden="true" /> Sign Out
        </button>
      </header>

      <main>
        <nav className="nav-tabs" aria-label="Main Navigation">
          <button 
            className={`tab-btn ${view === 'new' ? 'active' : ''}`}
            onClick={() => handleViewChange('new')}
            aria-selected={view === 'new'}
            role="tab"
          >
            <PlusCircle size={18} aria-hidden="true" /> New Roadmap
          </button>
          <button 
            className={`tab-btn ${view === 'history' ? 'active' : ''}`}
            onClick={() => handleViewChange('history')}
            aria-selected={view === 'history'}
            role="tab"
          >
            <History size={18} aria-hidden="true" /> My History
          </button>
        </nav>

      {view === 'new' && (
        <>
          <div className="header">
            <h1 className="title">Design Your Path</h1>
            <p className="subtitle">Tell us about yourself to get a tailored learning roadmap.</p>
          </div>

          <div className="info-box" role="region" aria-label="Instructions">
            <Info size={24} color="var(--primary-color)" style={{minWidth: '24px', marginTop: '2px'}} />
            <div className="info-text">
              <strong>How it works:</strong> Provide your background and what you want to learn. Our Gemini AI will analyze your profile and generate a perfectly structured, week-by-week roadmap tailored specifically for your experience level.
            </div>
          </div>

          <form className="form-card grid-form" onSubmit={handleSubmit} aria-label="Learning Roadmap Form">
            <div className="form-group">
              <label className="form-label" htmlFor="age">Age</label>
              <input type="number" id="age" name="age" className="form-input" placeholder="e.g., 25" value={formData.age} onChange={handleChange} required aria-required="true" />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="education">Education Level</label>
              <select id="education" name="education" className="form-select" value={formData.education} onChange={handleChange} required aria-required="true">
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
              <input type="text" id="currentWork" name="currentWork" className="form-input" placeholder="e.g., Software Engineer, Student" value={formData.currentWork} onChange={handleChange} required aria-required="true" />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="domain">Domain/Industry</label>
              <input type="text" id="domain" name="domain" className="form-input" placeholder="e.g., Tech, Finance, Healthcare" value={formData.domain} onChange={handleChange} required aria-required="true" />
            </div>

            <div className="form-group full-width">
              <label className="form-label" htmlFor="interest">What do you want to learn?</label>
              <input type="text" id="interest" name="interest" className="form-input" aria-describedby="interest-help" placeholder="e.g., Quantum Computing, React Native, Digital Marketing" value={formData.interest} onChange={handleChange} required aria-required="true" />
              <small id="interest-help" className="form-help">Be specific! The more details you provide, the better the AI can tailor your roadmap.</small>
            </div>

            <div className="form-group full-width">
              <label className="form-label" htmlFor="weeks">Time Available (Weeks)</label>
              <input type="number" id="weeks" name="weeks" className="form-input" aria-describedby="weeks-help" placeholder="e.g., 5" value={formData.weeks} onChange={handleChange} required min="1" max="52" aria-required="true" />
              <small id="weeks-help" className="form-help">Determines how many weekly milestones the AI will generate.</small>
            </div>

            <div className="full-width">
              <button type="submit" className="btn-submit" disabled={loading} aria-busy={loading}>
                {loading ? 'Generating...' : 'Generate AI Roadmap'}
              </button>
            </div>
            
            {error && <p role="alert" style={{ color: '#ef4444', marginTop: '15px', textAlign: 'center' }} className="full-width">{error}</p>}
          </form>

          <div aria-live="polite" aria-atomic="true">
            {loading && (
              <div className="loader">
                <div className="spinner" aria-label="Loading roadmap"></div>
              </div>
            )}

            {roadmap && !loading && (
              <div className="timeline-container">
                <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '15px'}}>
                  <button onClick={handleDownload} className="btn-secondary" aria-label="Download Roadmap">
                    <Download size={16} aria-hidden="true" /> Download Roadmap (MD)
                  </button>
                </div>
                <div className="timeline" aria-label="Generated Learning Roadmap">
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
            </div>
          )}
        </div>
      </>
      )}

      {view === 'history' && (
        <div className="history-view" aria-label="Your Learning History">
          {selectedHistoryItem ? (
            <div className="history-detail-view" aria-label="Detailed Roadmap View">
              <div style={{marginBottom: '20px'}}>
                <button onClick={() => setSelectedHistoryItem(null)} className="btn-secondary" aria-label="Back to History Grid">
                  &larr; Back to History
                </button>
              </div>
              
              <div className="header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px'}}>
                 <div>
                   <h2 className="title">{selectedHistoryItem.formData.interest}</h2>
                   <p className="subtitle">Generated on {new Date(selectedHistoryItem.createdAt).toLocaleDateString()}</p>
                 </div>
                 <button onClick={() => downloadRoadmap(selectedHistoryItem.roadmap)} className="btn-secondary" aria-label="Download Roadmap">
                   <Download size={16} aria-hidden="true" /> Download (MD)
                 </button>
              </div>

              <div className="timeline-container">
                <div className="timeline" aria-label="Detailed Learning Roadmap">
                  {selectedHistoryItem.roadmap.map((milestone, index) => (
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
              </div>
            </div>
          ) : (
            <>
              <div className="header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px'}}>
                <div>
                  <h1 className="title" style={{fontSize: '2.5rem', marginBottom: '5px'}}>Your Learning Journey</h1>
                  <p className="subtitle">A track record of your interests over time.</p>
                </div>
                {historyItems.length > 0 && !loadingHistory && (
                  <button onClick={handleClearHistory} className="btn-danger" aria-label="Clear All History">
                    <Trash2 size={16} aria-hidden="true" /> Clear History
                  </button>
                )}
              </div>
              
              <div aria-live="polite">
                {loadingHistory ? (
                  <div className="loader"><div className="spinner" aria-label="Loading history"></div></div>
                ) : historyItems.length === 0 ? (
                  <div className="empty-state">
                    <History size={48} color="var(--text-muted)" style={{opacity: 0.5, marginBottom: '20px'}} aria-hidden="true" />
                    <p style={{color: 'var(--text-muted)'}}>No roadmaps generated yet. Create one to see it here!</p>
                  </div>
                ) : (
                  <div className="history-grid">
                    {historyItems.map(item => (
                      <div 
                        key={item.id} 
                        className="history-card form-card" 
                        tabIndex="0" 
                        style={{position: 'relative', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'}}
                        onClick={() => setSelectedHistoryItem(item)}
                        onKeyDown={(e) => { if (e.key === 'Enter') setSelectedHistoryItem(item); }}
                      >
                          <button 
                            onClick={(e) => handleDeleteItem(item.id, e)} 
                            className="btn-delete-card" 
                            aria-label={`Delete roadmap for ${item.formData.interest}`}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                          <div className="history-card-header" style={{paddingRight: '30px'}}>
                            <h3>{item.formData.interest}</h3>
                            <span className="date-badge">{new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="history-meta" style={{display: 'flex', gap: '15px', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '15px'}}>
                            <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}><Briefcase size={14} aria-hidden="true"/> {item.formData.currentWork}</span>
                            <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}><GraduationCap size={14} aria-hidden="true"/> {item.formData.education}</span>
                            {item.formData.weeks && <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>⏳ {item.formData.weeks} weeks</span>}
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
            </>
          )}
        </div>
      )}
      </main>
    </div>
  );
}

export default App;
