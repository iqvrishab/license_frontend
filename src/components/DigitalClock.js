import React, { useEffect, useState } from 'react';
import './DigitalClock.css';

const DigitalClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');

  return (
    <div className="digital-clock">
      <span className="clock-hour">{hours}</span>
      <span className="clock-colon">:</span>
      <span className="clock-minute">{minutes}</span>
    </div>
  );
};

export default DigitalClock; 