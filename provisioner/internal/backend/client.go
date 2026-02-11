package backend

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client handles communication with the CloudSelf backend API
type Client struct {
	baseURL    string
	httpClient *http.Client
}

// WebsiteResponse represents a website from the backend
type WebsiteResponse struct {
	ID           int       `json:"id"`
	UserID       string    `json:"userId"`
	WebsiteName  string    `json:"websiteName"`
	HTMLContent  string    `json:"htmlContent"`
	Status       string    `json:"status"`
	PodIPAddress *string   `json:"podIpAddress"`
	ErrorMessage *string   `json:"errorMessage"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// UpdateStatusRequest represents the request body for updating website status
type UpdateStatusRequest struct {
	Status       string  `json:"status"`
	PodIPAddress *string `json:"podIpAddress,omitempty"`
	ErrorMessage *string `json:"errorMessage,omitempty"`
}

// APIResponse represents the standard API response wrapper from the backend
type APIResponse struct {
	Success bool              `json:"success"`
	Data    []WebsiteResponse `json:"data"`
	Count   int               `json:"count"`
}

// NewClient creates a new backend API client
func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// GetPendingWebsites retrieves all websites with status='pending' from the backend
func (c *Client) GetPendingWebsites() ([]WebsiteResponse, error) {
	url := fmt.Sprintf("%s/api/provisioner/websites/pending", c.baseURL)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code %d: %s", resp.StatusCode, string(body))
	}

	var apiResp APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return apiResp.Data, nil
}

// UpdateWebsiteStatus updates the status of a website in the backend
func (c *Client) UpdateWebsiteStatus(websiteID int, status string, podIPAddress *string, errorMessage *string) error {
	url := fmt.Sprintf("%s/api/provisioner/websites/%d/status", c.baseURL, websiteID)
	reqBody := UpdateStatusRequest{
		Status:       status,
		PodIPAddress: podIPAddress,
		ErrorMessage: errorMessage,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request body: %w", err)
	}

	req, err := http.NewRequest("PUT", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unexpected status code %d: %s", resp.StatusCode, string(body))
	}

	return nil
}
