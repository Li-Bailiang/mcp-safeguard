package main

import (
	"fmt"
	"net/http"
	"os/exec"
)

// VULNERABLE: Command injection via shell
func pingHost(host string) error {
	cmd := exec.Command("sh", "-c", "ping -c 4 "+host)
	output, err := cmd.CombinedOutput()
	fmt.Println(string(output))
	return err
}

// VULNERABLE: Command injection with fmt.Sprintf
func listFiles(dir string) error {
	cmdStr := fmt.Sprintf("ls -la %s", dir)
	cmd := exec.Command("bash", "-c", cmdStr)
	return cmd.Run()
}

// VULNERABLE: User input in command argument
func processFile(filename string) error {
	cmd := exec.Command("cat", "/tmp/"+filename)
	return cmd.Run()
}

func handler(w http.ResponseWriter, r *http.Request) {
	host := r.URL.Query().Get("host")
	pingHost(host) // User can inject: "example.com; rm -rf /"
}
