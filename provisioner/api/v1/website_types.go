/*
Copyright 2026.

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

package v1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// WebsiteSpec defines the desired state of Website
type WebsiteSpec struct {
	// WebsiteName is the DNS-compliant name for the website (lowercase, hyphens, alphanumeric)
	//+kubebuilder:validation:Required
	//+kubebuilder:validation:MinLength=1
	//+kubebuilder:validation:MaxLength=63
	//+kubebuilder:validation:Pattern=`^[a-z0-9]([-a-z0-9]*[a-z0-9])?$`
	WebsiteName string `json:"websiteName"`

	// HTMLContent is the HTML content to serve (max 100KB)
	//+kubebuilder:validation:Required
	//+kubebuilder:validation:MaxLength=102400
	HTMLContent string `json:"htmlContent"`

	// UserID is the user who owns this website
	//+kubebuilder:validation:Required
	UserID string `json:"userId"`

	// BackendID is the reference to the MySQL database record
	//+kubebuilder:validation:Required
	//+kubebuilder:validation:Minimum=1
	BackendID int `json:"backendId"`
}

// WebsiteStatus defines the observed state of Website
type WebsiteStatus struct {
	// Status represents the current lifecycle phase (pending, provisioned, failed)
	//+kubebuilder:validation:Enum=pending;provisioned;failed
	Status string `json:"status,omitempty"`

	// PodIPAddress is the internal IP address of the nginx pod
	PodIPAddress string `json:"podIpAddress,omitempty"`

	// ErrorMessage provides error context if provisioning failed
	ErrorMessage string `json:"errorMessage,omitempty"`

	// LastReconcileTime is the timestamp of the last reconciliation
	LastReconcileTime *metav1.Time `json:"lastReconcileTime,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced,shortName=ws
//+kubebuilder:printcolumn:name="Website Name",type=string,JSONPath=`.spec.websiteName`
//+kubebuilder:printcolumn:name="Phase",type=string,JSONPath=`.status.phase`
//+kubebuilder:printcolumn:name="Pod IP",type=string,JSONPath=`.status.podIP`
//+kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`

// Website is the Schema for the websites API
type Website struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   WebsiteSpec   `json:"spec,omitempty"`
	Status WebsiteStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// WebsiteList contains a list of Website
type WebsiteList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Website `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Website{}, &WebsiteList{})
}
