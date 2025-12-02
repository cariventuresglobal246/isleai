import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { TourProvider, useTour } from '@reactour/tour';
import isleImage from '../isle4.png';

// Create Supabase client at module level to ensure singleton, with schema specified
const supabaseUrl = 'https://lgurtucciqvwgjaphdqp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndXJ0dWNjaXF2d2dqYXBoZHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk2MzgzNTAsImV4cCI6MjA0NTIxNDM1MH0.I1ajlHp5b4pGL-NQzzvcVdznoiyIvps49Ws5GZHSXzk';
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'onboarding' },
});

const Onboarding = () => {
  const { setIsOpen } = useTour();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [formData, setFormData] = useState({
    fullName: '',
    country: 'Barbados',
    interests: [],
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const caribbeanCountries = [
    'Antigua and Barbuda', 'Bahamas', 'Barbados', 'Belize', 'Dominica',
    'Grenada', 'Guyana', 'Jamaica', 'Saint Kitts and Nevis', 'Saint Lucia',
    'Saint Vincent and the Grenadines', 'Suriname', 'Trinidad and Tobago'
  ];

  const interestsOptions = [
    'Beaches', 'Cultural Festivals', 'Food', 'History', 'Sports', 'Nature', 'Music'
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        interests: checked
          ? [...prev.interests, value]
          : prev.interests.filter((item) => item !== value),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setError('');
    setSuccess('');
  };

  const handleNext = async () => {
    if (currentSlide === 0 && !formData.fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (currentSlide === 1 && !formData.country) {
      setError('Please select a country.');
      return;
    }
    if (currentSlide === 2 && formData.interests.length === 0) {
      setError('Please select at least one interest.');
      return;
    }

    if (currentSlide < 2) {
      setCurrentSlide(currentSlide + 1);
    } else {
      setIsLoading(true);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('User not authenticated');
        }

        console.log('Auth user:', user); // Debug log to confirm structure

        const insertData = {
          user_id: user.id,
          full_name: formData.fullName,
          country: formData.country,
          interests: formData.interests,
          is_first_time_user: false,
        };

        const { data, error: insertError } = await supabase
          .from('user_onboarding')
          .insert([insertData]);

        console.log('Insert result:', data); // Log success data

        if (insertError) {
          console.error('Supabase insert error:', insertError);
          throw insertError;
        }

        setSuccess('Profile updated successfully!');
        localStorage.setItem('isFirstTime', 'true');
        navigate('/baje-tour', { state: { startTour: true } });
      } catch (error) {
        console.error('Insert error:', error);
        setError(error.message || 'Failed to save profile');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      console.log('Auth user:', user); // Debug log to confirm structure

      const insertData = {
        user_id: user.id,
        is_first_time_user: false,
      };

      const { data, error: insertError } = await supabase
        .from('user_onboarding')
        .insert([insertData]);

      console.log('Skip insert result:', data); // Log success data

      if (insertError) {
        console.error('Supabase skip insert error:', insertError);
        throw insertError;
      }

      localStorage.setItem('isFirstTime', 'true');
      navigate('/baje', { state: { startTour: true } });
    } catch (error) {
      console.error('Skip insert error:', error);
      setError(error.message || 'Failed to skip onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const startTour = window.location.state?.startTour;
    if (startTour) {
      setIsOpen(true);
    }
  }, [setIsOpen]);

  const steps = [
    {
      selector: '.input-section',
      content: 'Ask questions about your selected country or upload files here.',
    },
    {
      selector: '.notification-button',
      content: 'View notifications like quiz results or responses here.',
    },
    {
      selector: '.report-button',
      content: 'Report issues like traffic or infrastructure problems here.',
    },
    {
      selector: '.hamburger-button',
      content: 'Access the navigation menu to explore features like Dashboard or Settings.',
    },
    {
      selector: '.barbados-flag',
      content: 'Change your country to explore different Caribbean destinations.',
    },
  ];

  return (
    <>
      <style jsx="true">{`
        body {
            background: var(--bg-gradient);
         --bg-gradient: linear-gradient(135deg, #000000, #1E90FF);
          display: flex;
          min-height: 100vh;
          align-items: center;
          justify-content: center;
        }
        .mainContainer {
          position: relative;
          width: 700px;
          max-width: 90%;
          height: 840px;
          margin: 0 auto;
          background: #121212;
          overflow: hidden;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: white;
          font-family: Jost, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', Helvetica, Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft Yahei UI', 'Microsoft Yahei', 'Source Han Sans CN', sans-serif;
        }
        .onboardingHeader {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 20px 30px;
          margin-bottom: 5px;
        }
        .logoContainer {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 20vh;
          margin-bottom: -30px;
        }
        .logoImage {
          max-width: 100%;
          height: 70%;
        }
        .onboardingForm {
          width: 80%;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 5px;
        }
        .inputGroup {
          width: 100%;
          margin-bottom: 20px;
        }
        .inputGroupLabel {
          display: block;
          margin-bottom: 10px;
          color: #a0a0a0;
          font-size: 16px;
        }
        .inputGroupInput {
          width: 100%;
          height: 50px;
          background: #1e1e1e;
          border: 1px solid #303139;
          border-radius: 10px;
          color: white;
          padding: 0 15px;
          font-size: 16px;
        }
        .select {
          width: 100%;
          height: 50px;
          background: #1e1e1e;
          border: 1px solid #303139;
          border-radius: 10px;
          color: white;
          padding: 0 15px;
          font-size: 16px;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          background-size: 1em;
        }
        .checkboxContainer {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        .checkbox {
          margin-right: 10px;
          width: 20px;
          height: 20px;
        }
        .checkboxLabel {
          color: #a0a0a0;
          font-size: 16px;
        }
        .nextButton {
          width: 100%;
          height: 50px;
          background: #5db075;
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.3s ease;
          margin-bottom: 10px;
          margin-left: 20px;
        }
        .nextButtonDisabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .skipButton {
          width: 100%;
          height: 50px;
          background: transparent;
          border: 1px solid #5db075;
          border-radius: 10px;
          color: #5db075;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.3s ease, color 0.3s ease;
          margin-left: 20px;
        }
        .skipButtonDisabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .errorMessage {
          color: #ff4d4d;
          margin-bottom: 20px;
          font-size: 14px;
          text-align: center;
        }
        .successMessage {
          color: #5db075;
          margin-bottom: 20px;
          font-size: 14px;
          text-align: center;
        }
        .progress {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .dot {
          width: 10px;
          height: 10px;
          background: #a0a0a0;
          border-radius: 50%;
        }
        .dotActive {
          background: #5db075;
        }
        .slide {
          width: 100%;
          display: none;
        }
        .slideActive {
          display: block;
        }

        /* Mobile Portrait (320px to 374px) */
        @media (min-width: 320px) and (max-width: 374px) {
          body {
            padding: 8px;
            align-items: flex-start;
          }
          .mainContainer {
            width: 100%;
            height: auto;
            min-height: 60px;
            border-radius: 6px;
            padding: 8px;
            margin: 80px 0 0 0;
          }
          .onboardingHeader {
            padding: 12px 16px;
            margin-bottom: 8px;
          }
          .logoContainer {
            height: 12vh;
            margin-bottom: -15px;
          }
          .logoImage {
            height: 55%;
          }
          .onboardingForm {
            width: 95%;
            margin-top: 8px;
            margin-right: 10px;
          }
          .inputGroup {
            margin-bottom: 12px;
            margin-right: 8px;
          }
          .inputGroupLabel {
            font-size: 13px;
            margin-bottom: 6px;
          }
          .inputGroupInput {
            height: 36px;
            font-size: 13px;
            padding: 0 8px;
            border-radius: 6px;
          }
          .select {
            height: 36px;
            font-size: 13px;
            padding: 0 8px;
            border-radius: 6px;
            background-position: right 0.5rem center;
            background-size: 0.8em;
          }
          .checkboxContainer {
            margin-bottom: 8px;
          }
          .checkbox {
            width: 16px;
            height: 16px;
          }
          .checkboxLabel {
            font-size: 13px;
          }
          .nextButton {
            height: 36px;
            font-size: 14px;
            margin-left: 0;
            margin-bottom: 6px;
            border-radius: 6px;
          }
          .skipButton {
            height: 36px;
            font-size: 13px;
            margin-left: 0;
            border-radius: 6px;
          }
          .errorMessage {
            font-size: 11px;
            margin-bottom: 12px;
          }
          .successMessage {
            font-size: 11px;
            margin-bottom: 12px;
          }
          .progress {
            gap: 8px;
            margin-bottom: 12px;
          }
          .dot {
            width: 8px;
            height: 8px;
          }
        }

        /* Mobile Portrait (375px to 424px) */
        @media (min-width: 375px) and (max-width: 424px) {
          body {
            padding: 8px;
            align-items: flex-start;
          }
          .mainContainer {
            width: 100%;
            height: auto;
            min-height: 60px;
            border-radius: 6px;
            padding: 10px;
            margin: 80px 0 0 0;
          }
          .onboardingHeader {
            padding: 15px 20px;
            margin-bottom: 10px;
          }
          .logoContainer {
            height: 15vh;
            margin-bottom: -20px;
          }
          .logoImage {
            height: 60%;
          }
          .onboardingForm {
            width: 92%;
            margin-top: 10px;
            margin-right: 15px;
          }
          .inputGroup {
            margin-bottom: 15px;
            margin-right: 10px;
          }
          .inputGroupLabel {
            font-size: 14px;
            margin-bottom: 8px;
          }
          .inputGroupInput {
            height: 40px;
            font-size: 14px;
            padding: 0 10px;
            border-radius: 8px;
          }
          .select {
            height: 40px;
            font-size: 14px;
            padding: 0 10px;
            border-radius: 8px;
            background-position: right 0.75rem center;
            background-size: 0.9em;
          }
          .checkboxContainer {
            margin-bottom: 9px;
          }
          .checkbox {
            width: 18px;
            height: 18px;
          }
          .checkboxLabel {
            font-size: 14px;
          }
          .nextButton {
            height: 40px;
            font-size: 16px;
            margin-left: 0;
            margin-bottom: 8px;
            border-radius: 8px;
          }
          .skipButton {
            height: 40px;
            font-size: 14px;
            margin-left: 0;
            border-radius: 8px;
          }
          .errorMessage {
            font-size: 12px;
            margin-bottom: 15px;
          }
          .successMessage {
            font-size: 12px;
            margin-bottom: 15px;
          }
          .progress {
            gap: 9px;
            margin-bottom: 15px;
          }
          .dot {
            width: 9px;
            height: 9px;
          }
        }

        /* Mobile Portrait (425px to 479px) */
        @media (min-width: 425px) and (max-width: 479px) {
          body {
            padding: 8px;
            align-items: flex-start;
          }
          .mainContainer {
            width: 100%;
            height: auto;
            min-height: 60px;
            border-radius: 6px;
            padding: 12px;
            margin: 80px 0 0 0;
          }
          .onboardingHeader {
            padding: 15px 20px;
            margin-bottom: 10px;
          }
          .logoContainer {
            height: 15vh;
            margin-bottom: -20px;
          }
          .logoImage {
            height: 60%;
          }
          .onboardingForm {
            width: 90%;
            margin-top: 10px;
            margin-right: 20px;
          }
          .inputGroup {
            margin-bottom: 15px;
            margin-right: 10px;
          }
          .inputGroupLabel {
            font-size: 14px;
            margin-bottom: 8px;
          }
          .inputGroupInput {
            height: 40px;
            font-size: 14px;
            padding: 0 10px;
            border-radius: 8px;
          }
          .select {
            height: 40px;
            font-size: 14px;
            padding: 0 10px;
            border-radius: 8px;
            background-position: right 0.75rem center;
            background-size: 0.9em;
          }
          .checkboxContainer {
            margin-bottom: 9px;
          }
          .checkbox {
            width: 18px;
            height: 18px;
          }
          .checkboxLabel {
            font-size: 14px;
          }
          .nextButton {
            height: 40px;
            font-size: 16px;
            margin-left: 0;
            margin-bottom: 8px;
            border-radius: 8px;
          }
          .skipButton {
            height: 40px;
            font-size: 14px;
            margin-left: 0;
            border-radius: 8px;
          }
          .errorMessage {
            font-size: 12px;
            margin-bottom: 15px;
          }
          .successMessage {
            font-size: 12px;
            margin-bottom: 15px;
          }
          .progress {
            gap: 9px;
            margin-bottom: 15px;
          }
          .dot {
            width: 9px;
            height: 9px;
          }
        }

        /* Mobile Landscape (481px to 767px) */
        @media (min-width: 481px) and (max-width: 767px) {
          body {
            padding: 12px;
            align-items: flex-start;
          }
          .mainContainer {
            width: 85%;
            height: auto;
            min-height: 650px;
            border-radius: 6px;
            padding: 15px;
          }
          .onboardingHeader {
            padding: 15px 25px;
            margin-bottom: 10px;
          }
          .logoContainer {
            height: 18vh;
            margin-bottom: -25px;
          }
          .logoImage {
            height: 65%;
          }
          .onboardingForm {
            width: 85%;
            margin-top: 8px;
          }
          .inputGroup {
            margin-bottom: 18px;
          }
          .inputGroupLabel {
            font-size: 15px;
            margin-bottom: 9px;
          }
          .inputGroupInput {
            height: 45px;
            font-size: 15px;
            padding: 0 12px;
            border-radius: 9px;
          }
          .select {
            height: 45px;
            font-size: 15px;
            padding: 0 12px;
            border-radius: 9px;
            background-position: right 0.9rem center;
            background-size: 0.95em;
          }
          .checkboxContainer {
            margin-bottom: 10px;
          }
          .checkbox {
            width: 18px;
            height: 18px;
          }
          .checkboxLabel {
            font-size: 15px;
          }
          .nextButton {
            height: 45px;
            font-size: 17px;
            margin-left: 10px;
            margin-bottom: 9px;
            border-radius: 9px;
          }
          .skipButton {
            height: 45px;
            font-size: 15px;
            margin-left: 10px;
            border-radius: 9px;
          }
          .errorMessage {
            font-size: 13px;
            margin-bottom: 18px;
          }
          .successMessage {
            font-size: 13px;
            margin-bottom: 18px;
          }
          .progress {
            gap: 10px;
            margin-bottom: 18px;
          }
          .dot {
            width: 10px;
            height: 10px;
          }
        }

        /* Tablet Portrait and Landscape (768px to 1024px) */
        @media (min-width: 768px) and (max-width: 1024px) {
          body {
            padding: 16px;
          }
          .mainContainer {
            display: flex;
            align-items: center;
            width: 300%;
            height: 700px;
            border-radius: 7px;
            padding: 100px;
            margin-left: -90px;
          }
          .onboardingHeader {
            padding: 18px 28px;
            margin-bottom: 8px;
          }
          .logoContainer {
            height: 18vh;
            margin-bottom: -28px;
          }
          .logoImage {
            height: 65%;
          }
          .onboardingForm {
            width: 80%;
            margin-top: 8px;
          }
          .inputGroup {
            margin-bottom: 18px;
          }
          .inputGroupLabel {
            font-size: 15px;
            margin-bottom: 9px;
          }
          .inputGroupInput {
            height: 48px;
            font-size: 15px;
            padding: 0 14px;
            border-radius: 9px;
          }
          .select {
            height: 48px;
            font-size: 15px;
            padding: 0 14px;
            border-radius: 9px;
            background-position: right 1rem center;
            background-size: 1em;
          }
          .checkboxContainer {
            margin-bottom: 10px;
          }
          .checkbox {
            width: 18px;
            height: 18px;
          }
          .checkboxLabel {
            font-size: 15px;
          }
          .nextButton {
            height: 48px;
            font-size: 17px;
            margin-left: 15px;
            margin-bottom: 9px;
            border-radius: 9px;
          }
          .skipButton {
            height: 48px;
            font-size: 15px;
            margin-left: 15px;
            border-radius: 9px;
          }
          .errorMessage {
            font-size: 13px;
            margin-bottom: 18px;
          }
          .successMessage {
            font-size: 13px;
            margin-bottom: 18px;
          }
          .progress {
            gap: 10px;
            margin-bottom: 18px;
          }
          .dot {
            width: 10px;
            height: 10px;
          }
        }
      `}</style>
      <TourProvider
        steps={steps}
        afterOpen={() => console.log('Onboarding tour started at', new Date().toISOString())}
        onClickClose={() => {
          console.log('Onboarding tour closed at', new Date().toISOString());
          setIsOpen(false);
          navigate('/baje-tour');
        }}
        afterClose={() => {
          console.log('Onboarding tour completed at', new Date().toISOString());
          navigate('/baje');
        }}
        styles={{
          popover: (base) => ({
            ...base,
            backgroundColor: '#1e1e1e',
            color: '#fff',
            borderRadius: '10px',
            zIndex: 10000,
          }),
          button: (base) => ({
            ...base,
            backgroundColor: '#5db075',
            color: '#fff',
            borderRadius: '10px',
            padding: '10px 20px',
          }),
          close: (base) => ({
            ...base,
            color: '#ff4d4d',
          }),
        }}
      >
        <div className="mainContainer">
          <div className="onboardingHeader">
            <div className="logoContainer">
              <img src={isleImage} alt="Isle" className="logoImage" />
            </div>
          </div>
          <div className="onboardingForm">
            <div className="progress">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className={currentSlide === index ? "dot dotActive" : "dot"}
                />
              ))}
            </div>
            <div className={currentSlide === 0 ? "slide slideActive" : "slide"}>
              <div className="inputGroup">
                <label className="inputGroupLabel" htmlFor="fullName">
                  Full Name
                </label>
                <input
                  className="inputGroupInput"
                  type="text"
                  name="fullName"
                  id="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className={currentSlide === 1 ? "slide slideActive" : "slide"}>
              <div className="inputGroup">
                <label className="inputGroupLabel" htmlFor="country">
                  Select Your Country
                </label>
                <select
                  className="select"
                  name="country"
                  id="country"
                  value={formData.country}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                >
                  {caribbeanCountries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={currentSlide === 2 ? "slide slideActive" : "slide"}>
              <div className="inputGroup">
                <label className="inputGroupLabel">Select Your Interests</label>
                {interestsOptions.map((interest) => (
                  <div key={interest} className="checkboxContainer">
                    <input
                      type="checkbox"
                      name="interests"
                      value={interest}
                      checked={formData.interests.includes(interest)}
                      onChange={handleChange}
                      className="checkbox"
                      disabled={isLoading}
                    />
                    <label className="checkboxLabel">{interest}</label>
                  </div>
                ))}
              </div>
            </div>
            {error && <div className="errorMessage">{error}</div>}
            {success && <div className="successMessage">{success}</div>}
            <button
              className={isLoading ? "nextButton nextButtonDisabled" : "nextButton"}
              onClick={handleNext}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : currentSlide === 2 ? 'Finish' : 'Next'}
            </button>
            <button
              className={isLoading ? "skipButton skipButtonDisabled" : "skipButton"}
              onClick={handleSkip}
              disabled={isLoading}
            >
              Skip
            </button>
          </div>
        </div>
      </TourProvider>
    </>
  );
};

export default Onboarding;