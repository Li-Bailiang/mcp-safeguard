package main

import (
	"fmt"
	"os"
)

// VULNERABLE: defer in loop - files won't close until function returns
func processFiles(filenames []string) error {
	for _, filename := range filenames {
		file, err := os.Open(filename)
		if err != nil {
			return err
		}
		defer file.Close() // Won't execute until processFiles returns!

		// Process file...
		data := make([]byte, 100)
		file.Read(data)
	}
	return nil
}

// VULNERABLE: defer in for loop with database connections
func queryMultipleDatabases(queries []string) {
	for _, query := range queries {
		// Simulating resource acquisition
		resource := acquireResource()
		defer resource.Release() // Resource leak if many iterations

		fmt.Println("Executing:", query)
	}
}

type Resource struct{}

func (r *Resource) Release() {
	fmt.Println("Resource released")
}

func acquireResource() *Resource {
	return &Resource{}
}

func main() {
	files := []string{"file1.txt", "file2.txt", "file3.txt"}
	processFiles(files)
}
