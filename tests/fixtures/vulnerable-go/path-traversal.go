package main

import (
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
)

// VULNERABLE: Path traversal with filepath.Join
func readFile(filename string) ([]byte, error) {
	path := filepath.Join("/var/data", filename)
	return ioutil.ReadFile(path) // User can provide "../../../etc/passwd"
}

// VULNERABLE: Path traversal with string concatenation
func serveFile(w http.ResponseWriter, r *http.Request) {
	filename := r.URL.Query().Get("file")
	path := "/var/www/files/" + filename
	data, err := ioutil.ReadFile(path)
	if err != nil {
		http.Error(w, "File not found", 404)
		return
	}
	w.Write(data)
}

// VULNERABLE: Direct user input in file path
func deleteFile(w http.ResponseWriter, r *http.Request) {
	filename := r.FormValue("filename")
	fullPath := filepath.Join("/uploads", filename)
	os.Remove(fullPath)
}
