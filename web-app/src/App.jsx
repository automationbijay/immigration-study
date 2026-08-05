import React, { useState, useEffect } from 'react';
import PointsForm from './components/PointsForm';
import ScoreDisplay from './components/ScoreDisplay';
import './index.css';

function App() {
  const [formData, setFormData] = useState({
    age: 0,
    english: 0,
    overseasExp: 0,
    ausExp: 0,
    education: 0,
    specialistEdu: false,
    ausStudy: false,
    professionalYear: false,
    ccl: false,
    regionalStudy: false,
    partnerSkills: 0,
    stateNomination: true, // Always true for 190
  });

  const [totalPoints, setTotalPoints] = useState(5); // Default state nomination 5 pts

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : parseInt(value) || 0
    }));
  };

  useEffect(() => {
    let total = 0;
    
    // Add non-work experience select values
    total += formData.age;
    total += formData.english;
    total += formData.education;
    total += formData.partnerSkills;

    // Add checkbox values
    if (formData.specialistEdu) total += 10;
    if (formData.ausStudy) total += 5;
    if (formData.professionalYear) total += 5;
    if (formData.ccl) total += 5;
    if (formData.regionalStudy) total += 5;
    if (formData.stateNomination) total += 5;

    // Calculate work experience cap
    let workExperience = formData.overseasExp + formData.ausExp;
    if (workExperience > 20) {
      workExperience = 20;
    }
    
    total += workExperience;

    setTotalPoints(total);
  }, [formData]);

  return (
    <>
      <div className="background-elements">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
      </div>
      
      <div className="container">
          <header>
              <h1>Australia Visa <span>Calculator</span></h1>
              <p>Evaluate your eligibility for the Skilled Nominated visa (subclass 190).</p>
              <div className="legal-disclaimer">
                  <strong>Important Legal Requirement:</strong> As part of the General Skilled Migration (GSM) category, submitting an Expression of Interest (EOI) and receiving an official invitation is a mandatory prerequisite. You cannot apply for the visa unless invited by the government.
              </div>
          </header>

          <main className="calculator-card glass-panel">
              <PointsForm formData={formData} handleInputChange={handleInputChange} />
          </main>
      </div>

      <ScoreDisplay targetScore={totalPoints} />
    </>
  );
}

export default App;
