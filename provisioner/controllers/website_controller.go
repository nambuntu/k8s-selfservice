/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controllers

import (
	"context"
	"fmt"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	websitesv1 "github.com/cloudself/provisioner/api/v1"

	"github.com/cloudself/provisioner/internal/backend"
	"github.com/cloudself/provisioner/internal/nginx"
)

// WebsiteReconciler reconciles a Website object
type WebsiteReconciler struct {
	client.Client
	Scheme        *runtime.Scheme
	BackendClient *backend.Client
	PodBuilder    *nginx.PodBuilder
	PollingTicker *time.Ticker
	LastPollTime  time.Time
}

// +kubebuilder:rbac:groups=websites.cloudself.dev,resources=websites,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=websites.cloudself.dev,resources=websites/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=websites.cloudself.dev,resources=websites/finalizers,verbs=update
// +kubebuilder:rbac:groups=core,resources=pods,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=core,resources=services,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=core,resources=configmaps,verbs=get;list;watch;create;update;patch;delete

// Reconcile is part of the main kubernetes reconciliation loop
func (r *WebsiteReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)

	// Fetch the Website instance
	website := &websitesv1.Website{}
	err := r.Get(ctx, req.NamespacedName, website)
	if err != nil {
		if errors.IsNotFound(err) {
			logger.Info("Website resource not found. Ignoring since object must be deleted")
			return ctrl.Result{}, nil
		}
		logger.Error(err, "Failed to get Website")
		return ctrl.Result{}, err
	}

	// Check if the Website CR has been processed (has a pod IP)
	if website.Status.PodIPAddress != "" {
		logger.Info("Website already provisioned", "websiteName", website.Spec.WebsiteName, "podIP", website.Status.PodIPAddress)
		return ctrl.Result{}, nil
	}

	// Create ConfigMap with HTML content
	configMap := r.PodBuilder.BuildConfigMap(website.Spec.WebsiteName, website.Spec.HTMLContent)
	logger.Info("Creating ConfigMap", "name", configMap.Name)
	err = r.Create(ctx, configMap)
	if err != nil && !errors.IsAlreadyExists(err) {
		logger.Error(err, "Failed to create ConfigMap")
		// Update backend with error
		r.updateBackendStatus(website.Spec.BackendID, "failed", nil, stringPtr(fmt.Sprintf("Failed to create ConfigMap: %v", err)))
		return ctrl.Result{}, err
	}

	// Create Pod with nginx
	pod := r.PodBuilder.BuildPod(website.Spec.WebsiteName)
	logger.Info("Creating Pod", "name", pod.Name)
	err = r.Create(ctx, pod)
	if err != nil && !errors.IsAlreadyExists(err) {
		logger.Error(err, "Failed to create Pod")
		// Update backend with error
		r.updateBackendStatus(website.Spec.BackendID, "failed", nil, stringPtr(fmt.Sprintf("Failed to create Pod: %v", err)))
		return ctrl.Result{}, err
	}

	// If Pod already exists, fetch its current state
	if errors.IsAlreadyExists(err) {
		err = r.Get(ctx, client.ObjectKey{Name: pod.Name, Namespace: pod.Namespace}, pod)
		if err != nil {
			logger.Error(err, "Failed to get existing Pod")
			return ctrl.Result{}, err
		}
	}

	// Create Service to expose the Pod
	service := r.PodBuilder.BuildService(website.Spec.WebsiteName)
	logger.Info("Creating Service", "name", service.Name)
	err = r.Create(ctx, service)
	if err != nil && !errors.IsAlreadyExists(err) {
		logger.Error(err, "Failed to create Service")
		// Update backend with error
		r.updateBackendStatus(website.Spec.BackendID, "failed", nil, stringPtr(fmt.Sprintf("Failed to create Service: %v", err)))
		return ctrl.Result{}, err
	}

	// If Service already exists, fetch its current state
	if errors.IsAlreadyExists(err) {
		err = r.Get(ctx, client.ObjectKey{Name: service.Name, Namespace: service.Namespace}, service)
		if err != nil {
			logger.Error(err, "Failed to get existing Service")
			return ctrl.Result{}, err
		}
	}

	// Monitor Pod status and Service availability
	if pod.Status.Phase == corev1.PodRunning && len(service.Spec.Ports) > 0 {
		// Get the NodePort assigned to the service
		nodePort := service.Spec.Ports[0].NodePort
		if nodePort == 0 {
			// NodePort not yet assigned, requeue
			logger.Info("NodePort not yet assigned, requeueing")
			return ctrl.Result{RequeueAfter: time.Second * 5}, nil
		}

		// For Minikube/local development, construct the access URL
		// In production, this would be the external LoadBalancer IP
		// For now, we'll use the NodePort format: <node-ip>:<node-port>
		// The actual node IP will be determined at access time (typically Minikube IP)
		accessURL := fmt.Sprintf(":%d", nodePort)
		logger.Info("Pod is running and Service is ready", "nodePort", nodePort, "accessURL", accessURL)
		// Update Website CR status
		website.Status.PodIPAddress = accessURL
		website.Status.Status = "provisioned"
		if err := r.Status().Update(ctx, website); err != nil {
			logger.Error(err, "Failed to update Website status")
			return ctrl.Result{}, err
		}

		// Update backend with success
		r.updateBackendStatus(website.Spec.BackendID, "provisioned", &accessURL, nil)
		return ctrl.Result{}, nil
	}

	// Pod not ready yet, requeue
	logger.Info("Pod not ready yet, requeuing", "phase", pod.Status.Phase)
	return ctrl.Result{RequeueAfter: 5 * time.Second}, nil
}

// PollBackendForPendingWebsites polls the backend API for pending websites
func (r *WebsiteReconciler) PollBackendForPendingWebsites(ctx context.Context) error {
	logger := log.FromContext(ctx)

	// Check if enough time has passed since last poll
	if time.Since(r.LastPollTime) < 30*time.Second {
		return nil
	}
	r.LastPollTime = time.Now()

	logger.Info("Polling backend for pending websites")
	pendingWebsites, err := r.BackendClient.GetPendingWebsites()
	if err != nil {
		logger.Error(err, "Failed to get pending websites from backend")
		return err
	}

	logger.Info("Found pending websites", "count", len(pendingWebsites))

	// Create Website CRs for each pending website
	for _, w := range pendingWebsites {
		// Check if CR already exists
		existingWebsite := &websitesv1.Website{}
		err := r.Get(ctx, client.ObjectKey{
			Name:      w.WebsiteName,
			Namespace: "default",
		}, existingWebsite)
		if err == nil {
			// CR already exists, skip
			logger.Info("Website CR already exists", "name", w.WebsiteName)
			continue
		}
		if !errors.IsNotFound(err) {
			logger.Error(err, "Failed to check if Website CR exists", "name", w.WebsiteName)
			continue
		}

		// Create new Website CR
		website := &websitesv1.Website{
			ObjectMeta: ctrl.ObjectMeta{
				Name:      w.WebsiteName,
				Namespace: "default",
			},
			Spec: websitesv1.WebsiteSpec{
				WebsiteName: w.WebsiteName,
				HTMLContent: w.HTMLContent,
				UserID:      w.UserID,
				BackendID:   w.ID,
			},
		}

		logger.Info("Creating Website CR", "name", website.Name, "backendID", w.ID)
		err = r.Create(ctx, website)
		if err != nil {
			logger.Error(err, "Failed to create Website CR", "name", w.WebsiteName)
			// Update backend with error
			r.updateBackendStatus(w.ID, "failed", nil, stringPtr(fmt.Sprintf("Failed to create CR: %v", err)))
			continue
		}
	}

	return nil
}

// updateBackendStatus updates the website status in the backend
func (r *WebsiteReconciler) updateBackendStatus(backendID int, status string, podIPAddress *string, errorMessage *string) {
	logger := log.Log.WithName("updateBackendStatus")
	err := r.BackendClient.UpdateWebsiteStatus(backendID, status, podIPAddress, errorMessage)
	if err != nil {
		logger.Error(err, "Failed to update backend status", "backendID", backendID, "status", status)
	} else {
		logger.Info("Updated backend status", "backendID", backendID, "status", status)
	}
}

// stringPtr returns a pointer to the given string
func stringPtr(s string) *string {
	return &s
}

// SetupWithManager sets up the controller with the Manager.
func (r *WebsiteReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&websitesv1.Website{}).
		Owns(&corev1.Pod{}).
		Owns(&corev1.ConfigMap{}).
		Complete(r)
}
