import React, { useEffect, useState } from 'react';
import { websiteApi, Website } from '../services/api';
import WebsiteStatus from './WebsiteStatus';

interface WebsiteListProps {
  refreshTrigger?: number;
}

const WebsiteList: React.FC<WebsiteListProps> = ({ refreshTrigger }) => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);

  const fetchWebsites = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await websiteApi.listWebsites();
      setWebsites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load websites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, [refreshTrigger]);

  // Auto-refresh every 10 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchWebsites();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusBadgeClass = (status: Website['status']): string => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'provisioned':
        return 'status-provisioned';
      case 'failed':
        return 'status-failed';
      default:
        return '';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <div className="loading">Loading websites...</div>;
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <p>✗ {error}</p>
        <button onClick={fetchWebsites} className="btn btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  if (websites.length === 0) {
    return (
      <div className="empty-state">
        <p>No websites yet. Create your first website above!</p>
      </div>
    );
  }

  return (
    <div className="website-list">
      <div className="list-header">
        <h2>My Websites ({websites.length})</h2>
        <div className="list-actions">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-refresh (10s)</span>
          </label>
          <button onClick={fetchWebsites} className="btn btn-secondary btn-sm">
            🔄 Refresh
          </button>
        </div>
      </div>

      <table className="websites-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Title</th>
            <th>Status</th>
            <th>Pod IP</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {websites.map((website) => (
            <tr key={website.id}>
              <td>
                <code>{website.websiteName}</code>
              </td>
              <td>{website.websiteTitle}</td>
              <td>
                <span className={`status-badge ${getStatusBadgeClass(website.status)}`}>
                  {website.status}
                </span>
              </td>
              <td>
                {website.podIpAddress ? (
                  <a
                    href={`http://${website.podIpAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ip-link"
                  >
                    {website.podIpAddress}
                  </a>
                ) : (
                  <span className="text-muted">-</span>
                )}
              </td>
              <td>{formatDate(website.createdAt)}</td>
              <td>
                <button
                  onClick={() => setSelectedWebsite(website)}
                  className="btn btn-link btn-sm"
                  title="View Details"
                >
                  📋 Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {websites.some((w) => w.status === 'failed') && (
        <div className="alert alert-info">
          <strong>Note:</strong> Some websites failed to provision. Check the error messages for details.
        </div>
      )}

      {selectedWebsite && (
        <WebsiteStatus
          website={selectedWebsite}
          onClose={() => setSelectedWebsite(null)}
        />
      )}
    </div>
  );
};

export default WebsiteList;
