import React, { useState } from 'react';
import WebsiteForm from '../components/WebsiteForm';
import WebsiteList from '../components/WebsiteList';

const HomePage: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const handleWebsiteCreated = () => {
    // Trigger refresh of website list
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="home-page">
      <header className="page-header">
        <h1>CloudSelf - Website Provisioning</h1>
        <p>Create and manage your Kubernetes-hosted websites</p>
      </header>

      <div className="content-grid">
        <section className="form-section">
          <WebsiteForm onSuccess={handleWebsiteCreated} />
        </section>

        <section className="list-section">
          <WebsiteList refreshTrigger={refreshTrigger} />
        </section>
      </div>
    </div>
  );
};

export default HomePage;
