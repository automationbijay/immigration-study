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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : parseInt(value) || 0
    }));
  };

  // Derive total points directly during render (React Best Practice)
  let totalPoints = 0;
  
  // Add non-work experience select values
  totalPoints += formData.age;
  totalPoints += formData.english;
  totalPoints += formData.education;
  totalPoints += formData.partnerSkills;

  // Add checkbox values
  if (formData.specialistEdu) totalPoints += 10;
  if (formData.ausStudy) totalPoints += 5;
  if (formData.professionalYear) totalPoints += 5;
  if (formData.ccl) totalPoints += 5;
  if (formData.regionalStudy) totalPoints += 5;
  if (formData.stateNomination) totalPoints += 5;

  // Calculate work experience cap (Max 20 points)
  let workExperience = formData.overseasExp + formData.ausExp;
  if (workExperience > 20) {
    workExperience = 20;
  }
  
  totalPoints += workExperience;

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
