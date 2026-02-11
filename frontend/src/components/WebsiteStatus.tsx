import React from 'react';
import { Website } from '../services/api';

interface WebsiteStatusProps {
  website: Website;
  onClose: () => void;
}

const WebsiteStatus: React.FC<WebsiteStatusProps> = ({ website, onClose }) => {
  const getStatusInfo = (status: Website['status']) => {
    switch (status) {
      case 'pending':
        return {
          icon: '⏳',
          message: 'Your website is in the queue and will be provisioned shortly.',
          color: 'status-pending'
        };
      case 'provisioned':
        return {
          icon: '✅',
          message: 'Your website has been successfully provisioned and is ready to use!',
          color: 'status-provisioned'
        };
      case 'failed':
        return {
          icon: '❌',
          message: 'Website provisioning failed. Please check the error details below.',
          color: 'status-failed'
        };
      default:
        return {
          icon: '❓',
          message: 'Unknown status',
          color: ''
        };
    }
  };

  const statusInfo = getStatusInfo(website.status);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Website Details</h3>
          <button onClick={onClose} className="btn-close" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Status Summary */}
          <div className="status-summary">
            <div className="status-icon">{statusInfo.icon}</div>
            <div>
              <h4>
                <span className={`status-badge ${statusInfo.color}`}>
                  {website.status.toUpperCase()}
                </span>
              </h4>
              <p>{statusInfo.message}</p>
            </div>
          </div>

          {/* Website Information */}
          <div className="detail-section">
            <h5>Website Information</h5>
            
            <div className="detail-row">
              <label>DNS Name:</label>
              <code>{website.websiteName}</code>
            </div>

            <div className="detail-row">
              <label>Title:</label>
              <span>{website.websiteTitle}</span>
            </div>

            <div className="detail-row">
              <label>User ID:</label>
              <span>{website.userId}</span>
            </div>
          </div>

          {/* Provisioning Details */}
          <div className="detail-section">
            <h5>Provisioning Details</h5>
            
            <div className="detail-row">
              <label>Pod IP Address:</label>
              {website.podIpAddress ? (
                <a
                  href={`http://${website.podIpAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ip-link"
                  title="Click to open website"
                >
                  {website.podIpAddress} <span style={{ fontSize: '0.75rem' }}>↗</span>
                </a>
              ) : (
                <span className="text-muted">Not assigned yet</span>
              )}
            </div>

            {website.errorMessage && (
              <div className="detail-row">
                <label>Error:</label>
                <div className="alert alert-error" style={{ margin: 0 }}>
                  {website.errorMessage}
                </div>
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="detail-section">
            <h5>Timeline</h5>
            
            <div className="detail-row">
              <label>Created:</label>
              <span>{new Date(website.createdAt).toLocaleString()}</span>
            </div>

            <div className="detail-row">
              <label>Last Updated:</label>
              <span>{new Date(website.updatedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* HTML Content */}
          <div className="detail-section">
            <h5>HTML Content</h5>
            <div className="html-preview">
              <pre>{website.htmlContent}</pre>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {website.podIpAddress && website.status === 'provisioned' && (
            <a
              href={`http://${website.podIpAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              🌐 Visit Website
            </a>
          )}
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebsiteStatus;
