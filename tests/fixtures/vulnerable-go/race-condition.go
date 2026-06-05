package main

import (
	"fmt"
	"time"
)

// VULNERABLE: Race condition - shared variable without synchronization
var counter int

func incrementCounter() {
	for i := 0; i < 1000; i++ {
		go func() {
			counter++ // Race condition here
		}()
	}
}

// VULNERABLE: Race condition on struct field
type Account struct {
	Balance int
}

func (a *Account) withdraw(amount int) {
	go func() {
		a.Balance -= amount // Race condition
	}()
}

func main() {
	incrementCounter()

	account := &Account{Balance: 1000}
	for i := 0; i < 10; i++ {
		account.withdraw(50)
	}

	time.Sleep(1 * time.Second)
	fmt.Println("Counter:", counter)
	fmt.Println("Balance:", account.Balance)
}
