-- Create websites table
CREATE TABLE IF NOT EXISTS websites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  website_name VARCHAR(63) NOT NULL UNIQUE,
  website_title VARCHAR(255) NOT NULL,
  html_content TEXT NOT NULL,
  status ENUM('pending', 'provisioned', 'failed') NOT NULL DEFAULT 'pending',
  pod_ip_address VARCHAR(45) NULL,
  error_message TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_website_name (website_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
