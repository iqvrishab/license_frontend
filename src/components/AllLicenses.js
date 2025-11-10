import React, { useEffect, useMemo, useState } from 'react';
import { getAllLicenses, updateLicense } from './ApiClient';

// Helper function to get creation date from license
const getStartDate = (license) => {
  if (license.createdAt) {
    return new Date(license.createdAt).toLocaleDateString();
  }
  // Extract timestamp from MongoDB ObjectId if _id is available
  if (license._id) {
    try {
      const idStr = license._id.toString();
      // MongoDB ObjectId contains timestamp in first 8 hex characters
      const timestamp = parseInt(idStr.substring(0, 8), 16) * 1000;
      return new Date(timestamp).toLocaleDateString();
    } catch (e) {
      return '—';
    }
  }
  return '—';
};

// Groups licenses by clientId and renders a collapsible table
const AllLicenses = () => {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedClientIds, setExpandedClientIds] = useState({});
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editStatus, setEditStatus] = useState('active');
  const [editExpiry, setEditExpiry] = useState('');
  const [editLicenseType, setEditLicenseType] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAllLicenses();
        setLicenses(res.data || []);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    };
    load();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(load, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const lic of licenses) {
      const key = lic.clientId || '—';
      if (!map.has(key)) {
        map.set(key, { clientId: key, email: lic.clientEmail || lic.email || '—', items: [] });
      }
      map.get(key).items.push(lic);
      // prefer a non-empty email
      if (!map.get(key).email && (lic.clientEmail || lic.email)) {
        map.get(key).email = lic.clientEmail || lic.email;
      }
    }
    let arr = Array.from(map.values()).sort((a, b) => a.clientId.localeCompare(b.clientId));
    // filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(g =>
        (g.clientId || '').toLowerCase().includes(q) ||
        (g.email || '').toLowerCase().includes(q)
      );
    }
    // filter by product
    if (productFilter !== 'all') {
      arr = arr.map(g => ({
        ...g,
        items: g.items.filter(it => (it.application || it.product) === productFilter)
      })).filter(g => g.items.length > 0);
    }
    return arr;
  }, [licenses, search, productFilter]);

  const toggle = (clientId) => setExpandedClientIds(prev => ({ ...prev, [clientId]: !prev[clientId] }));

  if (loading) return <div className="page-content">Loading...</div>;
  if (error) return <div className="page-content">Failed to load licenses</div>;

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div className="page-title">Licenses Management</div>
        <div className="page-actions">
          <div className="search-wrap">
            <input
              className="search-input"
              placeholder="Search by client or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="filter-select" value={productFilter} onChange={e => setProductFilter(e.target.value)}>
            <option value="all">All Products</option>
            <option value="NMS">NMS</option>
            <option value="grafana">grafana</option>
            <option value="VAPT">VAPT</option>
          </select>
        </div>
      </div>
      <div className="subtle-caption">Showing {grouped.length} of {new Set(licenses.map(l => l.clientId)).size} clients</div>

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th className="col-num">#</th>
              <th className="col-id">Client ID</th>
              <th className="col-email">Client Email</th>
              <th className="col-lic">Licenses Used</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((group, idx) => (
              <React.Fragment key={group.clientId}>
                <tr onClick={() => toggle(group.clientId)} className="row-hover spaced-row client-row">
                  <td className="col-num">{idx + 1}</td>
                  <td className="col-id">{group.clientId}</td>
                  <td className="col-email">{group.email || '—'}</td>
                  <td className="col-lic">
                    <div className="pill pill-muted">{group.items.length}</div>
                  </td>
                  <td className="chevron-cell">
                    <span className={`chevron ${expandedClientIds[group.clientId] ? 'up' : 'down'}`}></span>
                  </td>
                </tr>
                {expandedClientIds[group.clientId] && (
                  <tr className="subrow">
                    <td className="license-span" colSpan={5}>
                      <div className="license-grid">
                        {group.items.map(item => (
                          <div key={item._id} className="license-card">
                            <div className="license-card-top">
                              <span className={`pill ${((item.application||item.product)==='NMS') ? 'pill-blue' : ((item.application||item.product)==='grafana') ? 'pill-amber' : 'pill-green'}`}>
                                {item.application || item.product}
                              </span>
                              <span className="pill pill-soft">{item.licenseType}</span>
                            </div>
                            <div className="license-meta">
                              <div className="meta-item"><span className="meta-label">Expiry</span> {new Date(item.expiryDate).toLocaleDateString()}</div>
                              <div className="meta-item"><span className="meta-label">Version</span> {item.zabbixVersion || item.version || item.NMSVersion || '—'}</div>
                              <div className="meta-item"><span className="meta-label">Hosts</span> {typeof item.totalHosts === 'number' ? item.totalHosts : '—'}</div>
                              <div className="meta-spacer" />
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn-outline" onClick={() => setSelected(item)}>Details</button>
                                <button className="btn-outline" onClick={() => { setSelected(item); setEditMode(true); setEditStatus(item.status); setEditExpiry(new Date(item.expiryDate).toISOString().slice(0,10)); setEditLicenseType(item.licenseType || ''); }}>Edit</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      {/* Details Modal */}
      {selected && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title">License Details</div>
              <button className="modal-close" onClick={() => { setSelected(null); setEditMode(false); setEditLicenseType(''); }}>×</button>
            </div>
            <div className="modal-body">
              {!editMode && (
                <>
                  <div className="modal-row"><span>License Key:</span> {selected.licenseKey}</div>
                  <div className="modal-row"><span>Instance ID:</span> {selected.instanceId}</div>
                  <div className="modal-row"><span>Product:</span> {selected.application || selected.product}</div>
                  <div className="modal-row"><span>License Type:</span> {selected.licenseType}</div>
                </>
              )}
              {editMode && (
                <>
                  <div className="modal-row"><span>License Key:</span> {selected.licenseKey}</div>
                  <div className="modal-row"><span>Instance ID:</span> {selected.instanceId}</div>
                  <div className="modal-row"><span>Product:</span> {selected.application || selected.product}</div>
                  <div className="modal-row"><span>License Type:</span>
                    <select value={editLicenseType} onChange={(e) => setEditLicenseType(e.target.value)}>
                      <option value="trial">Trial</option>
                      <option value="paid">Paid</option>
                      <option value="perpetual">Perpetual</option>
                    </select>
                  </div>
                </>
              )}
              {!editMode && (
                <>
                  {selected.identiqaName && (
                    <div className="modal-row"><span>Identiqa Name:</span> {selected.identiqaName}</div>
                  )}
                  {selected.identiqaEmail && (
                    <div className="modal-row"><span>Identiqa Email:</span> {selected.identiqaEmail}</div>
                  )}
                </>
              )}
              {!editMode ? (
                <>
                  <div className="modal-row"><span>Start Date:</span> {getStartDate(selected)}</div>
                  <div className="modal-row"><span>Status:</span> {selected.status}</div>
                  <div className="modal-row"><span>Expiry:</span> {new Date(selected.expiryDate).toLocaleDateString()}</div>
                </>
              ) : (
                <>
                  <div className="modal-row"><span>Start Date:</span> {getStartDate(selected)}</div>
                  <div className="modal-row"><span>Status:</span>
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                      <option value="expired">expired</option>
                    </select>
                  </div>
                  <div className="modal-row"><span>Expiry:</span>
                    <input type="date" value={editExpiry} onChange={(e) => setEditExpiry(e.target.value)} />
                  </div>
                </>
              )}
              {!editMode && (selected.zabbixVersion || selected.version || selected.NMSVersion) && (
                <div className="modal-row"><span>Version:</span> {selected.zabbixVersion || selected.version || selected.NMSVersion}</div>
              )}
              {!editMode && typeof selected.totalHosts === 'number' && (
                <div className="modal-row"><span>Total Hosts:</span> {selected.totalHosts}</div>
              )}
            </div>
            <div className="modal-actions">
              {editMode ? (
                <>
                  <button className="btn-outline" onClick={() => { setEditMode(false); setEditLicenseType(''); }}>Cancel</button>
                  <button className="btn" onClick={async () => {
                    try {
                      await updateLicense(selected.licenseKey, { status: editStatus, expiryDate: editExpiry, licenseType: editLicenseType });
                      // Update local state
                      const updated = licenses.map(l => l.licenseKey === selected.licenseKey ? { ...l, status: editStatus, expiryDate: editExpiry, licenseType: editLicenseType } : l);
                      setLicenses(updated);
                      setSelected({ ...selected, status: editStatus, expiryDate: editExpiry, licenseType: editLicenseType });
                      setEditMode(false);
                    } catch (e) {
                      alert('Failed to update license');
                    }
                  }}>Save</button>
                </>
              ) : (
                <button className="btn" onClick={() => { setSelected(null); setEditLicenseType(''); }}>Close</button>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AllLicenses; 