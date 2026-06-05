package main

import (
	"fmt"
	"time"
)

// VULNERABLE: panic in goroutine without recover
func processTask(id int) {
	go func() {
		if id < 0 {
			panic("invalid task ID") // This will crash the entire program
		}
		fmt.Println("Processing task:", id)
	}()
}

// VULNERABLE: panic in anonymous goroutine
func startWorker(data []int) {
	go func() {
		result := 100 / data[0] // May panic if data is empty or first element is 0
		fmt.Println("Result:", result)
	}()
}

func main() {
	processTask(-1)
	startWorker([]int{})
	time.Sleep(1 * time.Second)
}
