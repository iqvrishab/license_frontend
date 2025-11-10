import React, { useEffect, useMemo, useState } from 'react';
import { getAllLicenses } from './ApiClient';

const NoteCard = ({ group }) => {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className={`flip-card ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(v => !v)}>
      <div className="flip-inner">
        {/* Front side: client + products only */}
        <div className="flip-front note-card">
          <div className="note-title">{group.clientId}</div>
          <div className="note-sub">{group.email || '—'}</div>
          <div className="note-count">Licenses Used: {group.items.length}</div>
          <div className="note-body">
            {group.items.map(item => (
              <div key={item._id} className="note-line">
                <span className="pill pill-soft" style={{ marginRight: 8 }}>{item.application || item.product}</span>
              </div>
            ))}
          </div>
          <div className="note-hint">Click to view details</div>
        </div>
        {/* Back side: details */}
        <div className="flip-back note-card">
          <div className="note-title">{group.clientId}</div>
          <div className="note-sub">Licenses</div>
          <div className="note-body">
            {group.items.map(item => (
              <div key={item._id} className="note-line">
                <span className="pill pill-soft" style={{ marginRight: 8 }}>{item.application || item.product}</span>
                <span className="note-kv"><b>Type:</b> {item.licenseType}</span>
                <span className="note-kv"><b>Version:</b> {item.zabbixVersion || item.version || item.NMSVersion || '—'}</span>
                <span className="note-kv"><b>Expiry:</b> {new Date(item.expiryDate).toLocaleDateString()}</span>
                {typeof item.totalHosts === 'number' && (
                  <span className="note-kv"><b>Hosts:</b> {item.totalHosts}</span>
                )}
              </div>
            ))}
          </div>
          <div className="note-hint">Click to go back</div>
        </div>
      </div>
    </div>
  );
};

// Dashboard showing sticky-note style widgets grouped by client
const Overview = () => {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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
        map.set(key, {
          clientId: key,
          email: lic.identiqaEmail || lic.clientEmail || lic.email || '—',
          items: [],
        });
      }
      map.get(key).items.push(lic);
      if (!map.get(key).email && (lic.identiqaEmail || lic.clientEmail || lic.email)) {
        map.get(key).email = lic.identiqaEmail || lic.clientEmail || lic.email;
      }
    }
    return Array.from(map.values());
  }, [licenses]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return grouped;
    return grouped.filter(group => {
      const inClient = (group.clientId || '').toLowerCase().includes(q);
      const inEmail = (group.email || '').toLowerCase().includes(q);
      const inItems = group.items?.some(it => (
        (it.application || it.product || '').toLowerCase().includes(q) ||
        (it.licenseType || '').toLowerCase().includes(q)
      ));
      return inClient || inEmail || inItems;
    });
  }, [grouped, searchQuery]);

  // Calculate license statistics by type and software
  const licenseStats = useMemo(() => {
    const stats = {
      trial: { NMS: 0, grafana: 0, VAPT: 0, total: 0 },
      paid: { NMS: 0, grafana: 0, VAPT: 0, total: 0 },
      perpetual: { NMS: 0, grafana: 0, VAPT: 0, total: 0 }
    };

    licenses.forEach(lic => {
      const licenseType = (lic.licenseType || 'trial').toLowerCase();
      const softwareType = (lic.application || lic.product || '').toLowerCase();
      
      // Map lowercase software types to the correct keys
      const softwareTypeMap = {
        'nms': 'NMS',
        'grafana': 'grafana',
        'vapt': 'VAPT'
      };
      
      const mappedSoftwareType = softwareTypeMap[softwareType];
      
      if (stats[licenseType] && mappedSoftwareType) {
        stats[licenseType][mappedSoftwareType]++;
        stats[licenseType].total++;
      }
    });

    return stats;
  }, [licenses]);

  if (loading) return <div className="page-content">Loading...</div>;
  if (error) return <div className="page-content">Failed to load overview</div>;

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div style={{ marginLeft: 'auto' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search client, email, product..."
            style={{
              padding: '8px 12px',
              border: '1px solid #d0d7de',
              borderRadius: '6px',
              outline: 'none',
              minWidth: '260px'
            }}
          />
        </div>
      </div>
      
      {/* License Summary Section */}
      <div style={{ 
        marginBottom: '24px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #e0e0e0'
      }}>
        <div style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#333'
        }}>
          License Summary
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '16px' 
        }}>
          {/* Trial Licenses */}
          <div style={{ 
            backgroundColor: '#fff', 
            padding: '16px', 
            borderRadius: '6px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '12px',
              color: '#ff9800'
            }}>
              Trial Licenses: {licenseStats.trial.total}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>NMS:</span>
                <span style={{ fontWeight: '600' }}>{licenseStats.trial.NMS}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Grafana:</span>
                <span style={{ fontWeight: '600' }}>{licenseStats.trial.grafana}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>VAPT:</span>
                <span style={{ fontWeight: '600' }}>{licenseStats.trial.VAPT}</span>
              </div>
            </div>
          </div>

          {/* Paid Licenses */}
          <div style={{ 
            backgroundColor: '#fff', 
            padding: '16px', 
            borderRadius: '6px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '12px',
              color: '#4caf50'
            }}>
              Paid Licenses: {licenseStats.paid.total}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>NMS:</span>
                <span style={{ fontWeight: '600' }}>{licenseStats.paid.NMS}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Grafana:</span>
                <span style={{ fontWeight: '600' }}>{licenseStats.paid.grafana}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>VAPT:</span>
                <span style={{ fontWeight: '600' }}>{licenseStats.paid.VAPT}</span>
              </div>
            </div>
          </div>

          {/* Perpetual Licenses */}
          <div style={{ 
            backgroundColor: '#fff', 
            padding: '16px', 
            borderRadius: '6px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '12px',
              color: '#2196f3'
            }}>
              Perpetual Licenses: {licenseStats.perpetual.total}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>NMS:</span>
                <span style={{ fontWeight: '600' }}>{licenseStats.perpetual.NMS}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Grafana:</span>
                <span style={{ fontWeight: '600' }}>{licenseStats.perpetual.grafana}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>VAPT:</span>
                <span style={{ fontWeight: '600' }}>{licenseStats.perpetual.VAPT}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="notes-grid">
        {filteredGroups.map(group => (
          <NoteCard key={group.clientId} group={group} />
        ))}
      </div>
    </div>
  );
};

export default Overview;


