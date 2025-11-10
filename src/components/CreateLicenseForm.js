import React, { useEffect, useMemo, useState } from 'react';
import { generateLicense, getAllLicenses } from './ApiClient';

const CreateLicenseForm = ({ onLicenseCreated }) => {
  const [clientId, setClientId] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [identiqaName, setidentiqaName] = useState('');
  const [identiqaEmail, setidentiqaEmail] = useState('');
  const [years, setYears] = useState('1');
  const [product, setProduct] = useState('NMS');
  const [licenseType, setLicenseType] = useState('trial');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [knownClientIds, setKnownClientIds] = useState([]);
  const [knownClients, setKnownClients] = useState([]); // [{ clientId, email }]

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAllLicenses();
        const clients = (res.data || [])
          .filter(l => !!l.clientId)
          .map(l => ({ clientId: String(l.clientId).trim(), email: (l.clientEmail || l.email || '').trim() }));
        const ids = Array.from(new Set(clients.map(c => c.clientId.trim()))).sort();
        setKnownClients(clients);
        setKnownClientIds(ids);
      } catch (_) {}
    };
    load();
  }, []);

  const normalize = (s) => String(s || '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // control chars
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '') // zero-width chars
    .replace(/\s+/g, ' ')
    .trim();

  const handleClientIdChange = (value) => {
    const v = normalize(value);
    setClientId(v);
    const match = knownClients.find(c => c.clientId === v);
    if (match && !clientEmail) {
      setClientEmail(match.email);
    }
  };
  const handleClientIdBlur = () => setClientId(normalize(clientId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    let cleanedClientId = normalize(clientId);
    // Snap to canonical ID from the known list (case-insensitive)
    const canonical = knownClientIds.find(id => String(id).toLowerCase() === cleanedClientId.toLowerCase());
    if (canonical) cleanedClientId = canonical;
    const cleanedClientEmail = normalize(clientEmail);
    if (!cleanedClientId) {
      setError('Client ID is required');
      return;
    }

    // Calculate expiry date
    const now = new Date();
    let expiryDate;
    if (years === "0.082") {
      expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else {
      expiryDate = new Date(now.setFullYear(now.getFullYear() + parseInt(years)));
    }

    try {
      const response = await generateLicense({ 
        clientId: cleanedClientId, 
        expiryDate, 
        email: cleanedClientEmail, 
        application: product,
        licenseType,
        clientName: undefined,
        clientEmail: cleanedClientEmail,
        identiqaName,
        identiqaEmail
      });
      setSuccess(`License created successfully! License Key: ${response.data.licenseKey}, Instance ID: ${response.data.instanceId}`);
      setClientId('');
      setClientEmail('');
      setidentiqaName('');
      setidentiqaEmail('');
      setYears('1');
      setProduct('NMS');
      setLicenseType('trial');
      if (onLicenseCreated) {
        onLicenseCreated();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error creating license';
      setError(msg);
    }
  };

  return (
    <div className="create-license-form enhanced-form">
      <h3 className="form-title">Create New License</h3>
      <form onSubmit={handleSubmit} className="form-fields">
        {/* Top Row - Client and identiqa sections side by side */}
        <div className="form-top-row">
          {/* Client Section */}
          <div className="form-section">
            <h4 className="section-heading">Client</h4>
            <div className="form-row">
              <div className="form-label">Client ID:</div>
              <div className="form-input-container">
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => handleClientIdChange(e.target.value)}
                  onBlur={handleClientIdBlur}
                  autoComplete="off"
                  placeholder="Client ID"
                  required
                  className="form-input"
                  list="clientIdOptions"
                />
                <datalist id="clientIdOptions">
                  {knownClientIds.map(id => (
                    <option key={id} value={id} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="form-row">
              <div className="form-label">Client Email:</div>
              <div className="form-input-container">
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="Email Address"
                  required
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* identiqa Section */}
          <div className="form-section">
            <h4 className="section-heading">Identiqa</h4>
            <div className="form-row">
              <div className="form-label">Name:</div>
              <div className="form-input-container">
                <input
                  type="text"
                  value={identiqaName}
                  onChange={(e) => setidentiqaName(e.target.value)}
                  placeholder="Name"
                  required
                  className="form-input"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-label">Email Address:</div>
              <div className="form-input-container">
                <input
                  type="email"
                  value={identiqaEmail}
                  onChange={(e) => setidentiqaEmail(e.target.value)}
                  placeholder="Email Address"
                  required
                  className="form-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row - Other fields and button */}
        <div className="form-bottom-row">
          {/* Other Fields */}
          <div className="form-other-fields">
            <div className="form-row">
              <div className="form-label">Expiry Period:</div>
              <div className="form-input-container">
                <select value={years} onChange={e => setYears(e.target.value)} required className="form-input">
                  <option value="0.082">30 days</option>
                  <option value="1">1 year</option>
                  <option value="2">2 years</option>
                  <option value="3">3 years</option>
                  <option value="4">4 years</option>
                  <option value="5">5 years</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-label">License Type:</div>
              <div className="form-input-container">
                <select value={licenseType} onChange={e => setLicenseType(e.target.value)} required className="form-input">
                  <option value="trial">Trial</option>
                  <option value="paid">Paid</option>
                  <option value="perpetual">Perpetual</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-label">Software Type:</div>
              <div className="form-input-container">
                <select value={product} onChange={e => setProduct(e.target.value)} required className="form-input">
                  <option value="NMS">NMS</option>
                  <option value="grafana">grafana</option>
                  <option value="VAPT">VAPT</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Generate License Button */}
          <div className="form-button-container">
            <button type="submit" className="form-submit-btn">Generate License</button>
          </div>
        </div>
      </form>
      {error && <p className="error form-error">{error}</p>}
      {success && (
        <div className="license-key-box form-success">
          <h4>License Created!</h4>
          <div><b>License Key:</b> {success.match(/License Key: ([^,]+)/)?.[1]}</div>
          <div><b>Instance ID:</b> {success.match(/Instance ID: (.+)$/)?.[1]}</div>
        </div>
      )}
    </div>
  );
};

export default CreateLicenseForm; 