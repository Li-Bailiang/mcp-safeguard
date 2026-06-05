package main

import (
	"fmt"
	"time"
)

// VULNERABLE: Goroutine with infinite loop without context cancellation
func processData() {
	go func() {
		for {
			fmt.Println("Processing...")
			time.Sleep(1 * time.Second)
		}
	}()
}

// VULNERABLE: Goroutine listening on channel without cancellation mechanism
func listenForever(ch chan string) {
	go func() {
		for msg := range ch {
			fmt.Println(msg)
		}
	}()
}

func main() {
	processData()
	ch := make(chan string)
	listenForever(ch)

	// Main function exits, but goroutines keep running (leak)
	time.Sleep(5 * time.Second)
}
