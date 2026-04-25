import React, { useState } from 'react';

function App() {
  const [formData, setFormData] = useState({ age: '', education: '', interest: '' });
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRoadmap(null);

    try {
      const response = await fetch('http://localhost:3001/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate roadmap');
      }
      
      setRoadmap(data.roadmap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">AI Learning Roadmap</h1>
        <p className="subtitle">Discover your personalized path to mastering any skill.</p>
      </header>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="age">Your Age</label>
          <input 
            type="number" 
            id="age" 
            name="age" 
            className="form-input" 
            placeholder="e.g., 25" 
            value={formData.age} 
            onChange={handleChange} 
            required 
          />
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor="education">Current Education Level</label>
          <select 
            id="education" 
            name="education" 
            className="form-select" 
            value={formData.education} 
            onChange={handleChange} 
            required
          >
            <option value="" disabled>Select your education</option>
            <option value="High School">High School</option>
            <option value="Undergraduate">Undergraduate</option>
            <option value="Graduate">Graduate</option>
            <option value="Professional">Professional</option>
            <option value="Self-Taught">Self-Taught</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="interest">What do you want to learn?</label>
          <input 
            type="text" 
            id="interest" 
            name="interest" 
            className="form-input" 
            placeholder="e.g., Quantum Computing, Guitar, Machine Learning" 
            value={formData.interest} 
            onChange={handleChange} 
            required 
          />
        </div>

        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate Roadmap'}
        </button>
        
        {error && <p style={{ color: '#ef4444', marginTop: '15px', textAlign: 'center' }}>{error}</p>}
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
    </div>
  );
}

export default App;
