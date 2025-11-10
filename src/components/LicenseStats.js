import React, { useEffect, useState } from 'react';
import { getAllLicenses } from './ApiClient';

const LicenseStats = () => {
  const [stats, setStats] = useState({ 
    total: 0, 
    active: 0, 
    expired: 0,
    NMS: 0,
    grafana: 0,
    VAPT: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getAllLicenses();
        const licenses = response.data || [];
        const now = new Date();
        let active = 0, expired = 0, NMS = 0, grafana = 0, VAPT = 0;
        
        licenses.forEach(lic => {
          const isExpired = new Date(lic.expiryDate) < now || lic.status === 'expired' || lic.status === 'inactive';
          if (isExpired) {
            expired++;
          } else {
            active++;
            // Count active licenses by product
            const app = lic.application || lic.product;
            if (app === 'NMS') NMS++;
            else if (app === 'grafana') grafana++;
            else if (app === 'VAPT') VAPT++;
          }
        });
        
        setStats({ 
          total: licenses.length, 
          active, 
          expired,
          NMS,
          grafana,
          VAPT
        });
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch license stats');
        setLoading(false);
      }
    };
    fetchStats();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="license-stats-box">Loading stats...</div>;
  if (error) return <div className="license-stats-box">{error}</div>;

  return (
    <div className="license-stats-box">
      <div className="license-stats-container">
        {/* License Overview Section */}
        <div className="license-stats-section">
          <div className="license-stats-subtitle">License Overview</div>
          <div className="license-stats-overview">
            <div className="license-stats-overview-item">
              <div className="license-stats-overview-label">Total</div>
              <div className="license-stats-overview-value">{stats.total}</div>
            </div>
            <div className="license-stats-overview-item">
              <div className="license-stats-overview-label">Active</div>
              <div className="license-stats-overview-value">{stats.active}</div>
            </div>
            <div className="license-stats-overview-item">
              <div className="license-stats-overview-label">Expired</div>
              <div className="license-stats-overview-value">{stats.expired}</div>
            </div>
          </div>
        </div>

        {/* Active Licenses by Product Section */}
        <div className="license-stats-section">
          <div className="license-stats-subtitle">Active Licenses by Product</div>
          <div className="license-stats-products">
            <div className="license-stats-product">
              <div className="license-stats-product-label">NMS</div>
              <div className="license-stats-product-value">{stats.NMS}</div>
            </div>
            <div className="license-stats-product">
              <div className="license-stats-product-label">grafana</div>
              <div className="license-stats-product-value">{stats.grafana}</div>
            </div>
            <div className="license-stats-product">
              <div className="license-stats-product-label">VAPT</div>
              <div className="license-stats-product-value">{stats.VAPT}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseStats; 