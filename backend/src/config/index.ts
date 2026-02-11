import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  frontend: {
    url: string;
  };
  provisioner: {
    pollInterval: number;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'cloudself',
    password: process.env.DB_PASSWORD || 'cloudself_password',
    database: process.env.DB_NAME || 'cloudself',
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  provisioner: {
    pollInterval: parseInt(process.env.PROVISIONER_POLL_INTERVAL || '30000', 10),
  },
};

export default config;
