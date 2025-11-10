import React, { useState } from 'react';
import CreateLicenseForm from './CreateLicenseForm';
import DigitalClock from './DigitalClock';
import LicenseStats from './LicenseStats';

const CreateLicense = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const handleLicenseCreated = () => setRefreshKey(prev => prev + 1);
  return (
    <div className="create-license-dashboard">
      {/* Full width form at the top */}
      <div className="form-container">
        <CreateLicenseForm onLicenseCreated={handleLicenseCreated} key={refreshKey} />
      </div>
      
      {/* Time and stats widgets below */}
      <div className="widgets-container">
        <DigitalClock />
        <LicenseStats key={refreshKey} />
      </div>
    </div>
  );
};

export default CreateLicense; 