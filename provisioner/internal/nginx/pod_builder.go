package nginx

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// PodBuilder creates Kubernetes resources for hosting static HTML websites with nginx
type PodBuilder struct{}

// NewPodBuilder creates a new PodBuilder
func NewPodBuilder() *PodBuilder {
	return &PodBuilder{}
}

// BuildConfigMap creates a ConfigMap containing the HTML content
func (pb *PodBuilder) BuildConfigMap(websiteName, htmlContent string) *corev1.ConfigMap {
	return &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      websiteName,
			Namespace: "default",
			Labels: map[string]string{
				"app":                      "nginx",
				"cloudself.dev/website":    websiteName,
				"cloudself.dev/managed-by": "cloudself-provisioner",
			},
		},
		Data: map[string]string{
			"index.html": htmlContent,
		},
	}
}

// BuildPod creates a Pod running nginx with the HTML content from ConfigMap
func (pb *PodBuilder) BuildPod(websiteName string) *corev1.Pod {
	return &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      websiteName,
			Namespace: "default",
			Labels: map[string]string{
				"app":                      "nginx",
				"cloudself.dev/website":    websiteName,
				"cloudself.dev/managed-by": "cloudself-provisioner",
			},
		},
		Spec: corev1.PodSpec{
			Containers: []corev1.Container{
				{
					Name:  "nginx",
					Image: "nginx:1.25-alpine",
					Ports: []corev1.ContainerPort{
						{
							Name:          "http",
							ContainerPort: 80,
							Protocol:      corev1.ProtocolTCP,
						},
					},
					VolumeMounts: []corev1.VolumeMount{
						{
							Name:      "html-content",
							MountPath: "/usr/share/nginx/html",
							ReadOnly:  true,
						},
					},
					Resources: corev1.ResourceRequirements{
						Requests: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("100m"),
							corev1.ResourceMemory: resource.MustParse("64Mi"),
						},
						Limits: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("200m"),
							corev1.ResourceMemory: resource.MustParse("128Mi"),
						},
					},
				},
			},
			Volumes: []corev1.Volume{
				{
					Name: "html-content",
					VolumeSource: corev1.VolumeSource{
						ConfigMap: &corev1.ConfigMapVolumeSource{
							LocalObjectReference: corev1.LocalObjectReference{
								Name: websiteName,
							},
						},
					},
				},
			},
			RestartPolicy: corev1.RestartPolicyAlways,
		},
	}
}

// BuildService creates a Service to expose the nginx pod
// Using NodePort to make it accessible from outside the cluster
func (pb *PodBuilder) BuildService(websiteName string) *corev1.Service {
	return &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      websiteName,
			Namespace: "default",
			Labels: map[string]string{
				"app":                      "nginx",
				"cloudself.dev/website":    websiteName,
				"cloudself.dev/managed-by": "cloudself-provisioner",
			},
		},
		Spec: corev1.ServiceSpec{
			Type: corev1.ServiceTypeNodePort,
			Selector: map[string]string{
				"app":                   "nginx",
				"cloudself.dev/website": websiteName,
			},
			Ports: []corev1.ServicePort{
				{
					Name:     "http",
					Protocol: corev1.ProtocolTCP,
					Port:     80,
					// NodePort will be automatically assigned
				},
			},
		},
	}
}
