package main

import (
	"context"
	"fmt"
	"time"
)

// VULNERABLE: context.WithCancel without defer cancel()
func processWithContext() {
	ctx, cancel := context.WithCancel(context.Background())
	// Missing: defer cancel()

	go func() {
		<-ctx.Done()
		fmt.Println("Context cancelled")
	}()

	time.Sleep(1 * time.Second)
	cancel() // Manual call, but resource leak if function returns early
}

// VULNERABLE: context.WithTimeout without defer cancel()
func makeRequestWithTimeout(url string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	// Missing: defer cancel()

	// Simulate HTTP request
	select {
	case <-time.After(2 * time.Second):
		fmt.Println("Request completed")
	case <-ctx.Done():
		return ctx.Err()
	}

	cancel() // Will leak if early return happens
	return nil
}

// VULNERABLE: context.WithDeadline without defer cancel()
func scheduleTask() {
	deadline := time.Now().Add(10 * time.Second)
	ctx, cancel := context.WithDeadline(context.Background(), deadline)

	// Do some work
	fmt.Println("Task scheduled")

	// Forgot to call cancel()
	_ = cancel
	_ = ctx
}

func main() {
	processWithContext()
	makeRequestWithTimeout("https://example.com")
	scheduleTask()
}
