package main

import (
	"crypto/tls"
	"net/http"
)

// VULNERABLE: TLS verification disabled
func createInsecureClient() *http.Client {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true,
		},
	}
	return &http.Client{Transport: tr}
}

// VULNERABLE: Setting InsecureSkipVerify directly
func makeInsecureRequest(url string) error {
	config := &tls.Config{}
	config.InsecureSkipVerify = true

	tr := &http.Transport{
		TLSClientConfig: config,
	}
	client := &http.Client{Transport: tr}

	_, err := client.Get(url)
	return err
}

// VULNERABLE: Inline TLS config with InsecureSkipVerify
func quickRequest(url string) (*http.Response, error) {
	client := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}
	return client.Get(url)
}

func main() {
	client := createInsecureClient()
	client.Get("https://example.com")
}
