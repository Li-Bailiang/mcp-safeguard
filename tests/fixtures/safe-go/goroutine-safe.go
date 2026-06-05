package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// SAFE: Goroutine with context cancellation
func processDataSafe(ctx context.Context) {
	go func() {
		for {
			select {
			case <-ctx.Done():
				fmt.Println("Stopping goroutine")
				return
			default:
				fmt.Println("Processing...")
				time.Sleep(1 * time.Second)
			}
		}
	}()
}

// SAFE: Using WaitGroup for synchronization
func processItemsSafe(items []string) {
	var wg sync.WaitGroup

	for _, item := range items {
		wg.Add(1)
		go func(i string) {
			defer wg.Done()
			fmt.Println("Processing:", i)
			time.Sleep(1 * time.Second)
		}(item)
	}

	wg.Wait() // Wait for all goroutines to complete
}

// SAFE: Using channels for synchronization
func sendNotificationSafe(userID string) {
	done := make(chan bool)

	go func() {
		fmt.Printf("Sending notification to user %s\n", userID)
		time.Sleep(500 * time.Millisecond)
		fmt.Println("Notification sent")
		done <- true
	}()

	<-done // Wait for completion
}

// SAFE: Goroutine with proper cleanup
func startWorkerSafe(ctx context.Context) {
	var wg sync.WaitGroup
	wg.Add(1)

	go func() {
		defer wg.Done()
		for {
			select {
			case <-ctx.Done():
				return
			default:
				// Do work
				time.Sleep(100 * time.Millisecond)
			}
		}
	}()

	wg.Wait()
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	processDataSafe(ctx)
	processItemsSafe([]string{"a", "b", "c"})
	sendNotificationSafe("user123")

	time.Sleep(3 * time.Second)
	cancel()
}
