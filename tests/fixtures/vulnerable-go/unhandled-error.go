package main

import (
	"fmt"
	"io"
	"os"
)

// VULNERABLE: Ignoring Write error
func writeData(file *os.File, data []byte) {
	file.Write(data) // Error ignored
}

// VULNERABLE: Ignoring Close error on defer
func processFile(filename string) {
	file, err := os.Open(filename)
	if err != nil {
		return
	}
	defer file.Close() // Error ignored

	data := make([]byte, 100)
	file.Read(data)
}

// VULNERABLE: Ignoring io.Copy error
func copyFile(src, dst string) {
	source, _ := os.Open(src)
	defer source.Close()

	destination, _ := os.Create(dst)
	defer destination.Close()

	io.Copy(destination, source) // Error ignored - partial copy may occur
}

// VULNERABLE: Ignoring WriteString error
func appendLog(filename, message string) {
	file, err := os.OpenFile(filename, os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer file.Close()

	file.WriteString(message + "\n") // Error ignored
}

func main() {
	data := []byte("Hello, World!")
	file, _ := os.Create("output.txt")
	defer file.Close()

	writeData(file, data)
	fmt.Println("Done")
}
