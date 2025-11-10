import React, { useEffect, useState } from 'react';
import { getAllLicenses, deleteLicense, updateLicense } from './ApiClient';
import { Select, MenuItem, TextField, IconButton, Tooltip, Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

const ITEMS_PER_PAGE = 10;

const daysRemaining = (expiryDate) => {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? `${diffDays} days remaining` : 'Expired';
};

const LicenseList = () => {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchLicenses = async () => {
      try {
        const response = await getAllLicenses();
        setLicenses(response.data);
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };
    fetchLicenses();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchLicenses, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (licenseKey) => {
    const password = window.prompt('Enter your password to delete this license:');
    if (!password) return;
    
    try {
      setLoading(true);
      await deleteLicense(licenseKey, password); 
      setLicenses(licenses.filter((license) => license.licenseKey !== licenseKey));
      setLoading(false);
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditStatus(selectedLicense.status);
    setEditExpiry(new Date(selectedLicense.expiryDate).toISOString().split('T')[0]);
    setEditMode(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLicense(selectedLicense.licenseKey, {
        status: editStatus,
        expiryDate: editExpiry,
      });
      setLicenses(licenses.map(lic => lic.licenseKey === selectedLicense.licenseKey ? { ...lic, status: editStatus, expiryDate: editExpiry } : lic));
      setSelectedLicense({ ...selectedLicense, status: editStatus, expiryDate: editExpiry });
      setEditMode(false);
    } catch (err) {
      setError(err);
    }
    setSaving(false);
  };

  const filteredLicenses = licenses.filter(license =>
    Object.values(license).some(val =>
      String(val).toLowerCase().includes(search.toLowerCase())
    )
  );

  
  const totalPages = Math.ceil(filteredLicenses.length / ITEMS_PER_PAGE);
  const paginatedLicenses = filteredLicenses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (loading) return <p>Loading licenses...</p>;
  if (error) return <p>Error fetching licenses: {error.message}</p>;

  return (
    <div className="license-list">
      <h3>All Licenses</h3>
      <div className="search-bar-container">
        <input
          className="search-bar"
          type="text"
          placeholder="Search licenses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Client ID</th>
              <th>Expiry Date</th>
              <th>Software Type</th>
              <th>Version</th>
              <th>License Type</th>
              <th>Details</th>
              
            </tr>
          </thead>
          <tbody>
            {paginatedLicenses.map((license) => (
              <tr key={license._id}>
                <td>{license.clientId}</td>
                <td>{daysRemaining(license.expiryDate)}</td>
                <td>{license.application || license.product}</td>
                <td>
                  <Select
                    size="small"
                    displayEmpty
                    value={license.zabbixVersion || license.version || license.NMSVersion || ''}
                    renderValue={(selected) => selected || '—'}
                    variant="outlined"
                    sx={{
                      minWidth: 140,
                      borderRadius: 2,
                      fontSize: 14,
                      color: '#e5e7eb',
                      bgcolor: '#111827',
                      '& .MuiSvgIcon-root': { color: '#9ca3af' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#60a5fa' },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: '#1f2937',
                          color: '#e5e7eb',
                          border: '1px solid #374151',
                          boxShadow: '0 6px 24px rgba(0,0,0,0.35)'
                        }
                      }
                    }}
                  >
                    <MenuItem disabled value="" sx={{ color: '#9ca3af' }}>
                      <em>No data</em>
                    </MenuItem>
                    <MenuItem value={license.zabbixVersion || license.version || license.NMSVersion || ''} sx={{ '&.MuiMenuItem-root:hover': { bgcolor: '#374151' } }}>
                      Version: {license.zabbixVersion || license.version || license.NMSVersion || '—'}
                    </MenuItem>
                    <MenuItem value={(license.zabbixVersion || license.version || license.NMSVersion || '') + '-hosts'} sx={{ '&.MuiMenuItem-root:hover': { bgcolor: '#374151' } }}>
                      Total Hosts: {typeof license.totalHosts === 'number' ? license.totalHosts : '—'}
                    </MenuItem>
                  </Select>
                </td>
                <td>{license.licenseType}</td>
                <td>
                  <Button onClick={() => setSelectedLicense(license)} variant="contained" color="primary" size="small" sx={{ borderRadius: 2, fontWeight: 500, boxShadow: '0 1px 4px rgba(25,118,210,0.08)' }}>
                    Details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i + 1}
            onClick={() => handlePageChange(i + 1)}
            style={{
              margin: '0 4px',
              padding: '4px 10px',
              background: currentPage === i + 1 ? '#1976d2' : '#fff',
              color: currentPage === i + 1 ? '#fff' : '#1976d2',
              border: '1px solid #1976d2',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
      {/* Details Modal */}
      {selectedLicense && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="modal-content" style={{ background: '#fff', padding: 32, borderRadius: 16, minWidth: 360, position: 'relative', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
            {/* Edit Button */}
            {!editMode && (
              <Tooltip title="Edit License">
                <IconButton onClick={handleEdit} style={{ position: 'absolute', top: 18, right: 18 }}>
                  <EditIcon />
                </IconButton>
              </Tooltip>
            )}
            <h3 style={{ marginTop: 0, marginBottom: 18, textAlign: 'center' }}>License Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: 16, marginBottom: 8 }}>
              <div style={{ marginBottom: 2 }}><b>License Key:</b> {selectedLicense.licenseKey}</div>
              <div style={{ marginBottom: 2 }}><b>Instance ID:</b> {selectedLicense.instanceId}</div>
              <div style={{ marginBottom: 2 }}><b>Client ID:</b> {selectedLicense.clientId}</div>
              {selectedLicense.clientName && (<div style={{ marginBottom: 2 }}><b>Client Name:</b> {selectedLicense.clientName}</div>)}
              {selectedLicense.clientEmail && (<div style={{ marginBottom: 2 }}><b>Client Email:</b> {selectedLicense.clientEmail}</div>)}
              <div style={{ marginBottom: 2 }}><b>Email:</b> {selectedLicense.email}</div>
              <div style={{ marginBottom: 2 }}><b>Software Type:</b> {selectedLicense.application || selectedLicense.product}</div>
              {(selectedLicense.zabbixVersion || selectedLicense.version || selectedLicense.NMSVersion) && (
                <div style={{ marginBottom: 2 }}><b>Version:</b> {selectedLicense.zabbixVersion || selectedLicense.version || selectedLicense.NMSVersion}</div>
              )}
              {selectedLicense.identiqaName && (<div style={{ marginBottom: 2 }}><b>Identiqa Name:</b> {selectedLicense.identiqaName}</div>)}
              {selectedLicense.identiqaEmail && (<div style={{ marginBottom: 2 }}><b>Identiqa Email:</b> {selectedLicense.identiqaEmail}</div>)}
              <div style={{ marginBottom: 2 }}><b>License Type:</b> {selectedLicense.licenseType}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ minWidth: 90, fontWeight: 600 }}>Status:</span>
                {!editMode ? (
                  <span>{selectedLicense.status}</span>
                ) : (
                  <Select value={editStatus} onChange={e => setEditStatus(e.target.value)} size="small" sx={{ minWidth: 120, borderRadius: 2, fontSize: 15 }}>
                    <MenuItem value="active">active</MenuItem>
                    <MenuItem value="expired">inactive</MenuItem>
                  </Select>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ minWidth: 90, fontWeight: 600 }}>Expiry Date:</span>
                {!editMode ? (
                  <span>{new Date(selectedLicense.expiryDate).toLocaleDateString()}</span>
                ) : (
                  <TextField type="date" value={editExpiry} onChange={e => setEditExpiry(e.target.value)} size="small" sx={{ minWidth: 150, borderRadius: 2, fontSize: 15 }} InputLabelProps={{ shrink: true }} />
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              {editMode ? (
                <>
                  <Button onClick={() => setEditMode(false)} variant="outlined" color="inherit">Cancel</Button>
                  <Button onClick={handleSave} disabled={saving} variant="contained" color="primary">{saving ? 'Saving...' : 'Save'}</Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setSelectedLicense(null)} variant="outlined" color="inherit">Close</Button>
                  <Button onClick={() => { handleDelete(selectedLicense.licenseKey); setSelectedLicense(null); }} variant="outlined" color="error">Delete</Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LicenseList; 