package main

import (
	"fmt"
	"time"
)

// VULNERABLE: goroutine in main without synchronization
func main() {
	go func() {
		fmt.Println("This may not print!")
		time.Sleep(2 * time.Second)
		fmt.Println("This definitely won't print!")
	}()

	fmt.Println("Main function")
	// main exits immediately, goroutine is killed
}

// VULNERABLE: Multiple goroutines without WaitGroup
func processItems(items []string) {
	for _, item := range items {
		go func(i string) {
			fmt.Println("Processing:", i)
			time.Sleep(1 * time.Second)
		}(item)
	}
	// Function returns immediately, goroutines may not complete
}

// VULNERABLE: Fire and forget goroutine
func sendNotification(userID string) {
	go func() {
		fmt.Printf("Sending notification to user %s\n", userID)
		time.Sleep(500 * time.Millisecond)
		fmt.Println("Notification sent")
	}()
	// No guarantee notification completes
}
