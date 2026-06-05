package main

import (
	"fmt"
	"sync"
	"time"
)

// SAFE: Mutex for shared variable
var (
	counter int
	mu      sync.Mutex
)

func incrementCounterSafe() {
	var wg sync.WaitGroup

	for i := 0; i < 1000; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			mu.Lock()
			counter++
			mu.Unlock()
		}()
	}

	wg.Wait()
}

// SAFE: Mutex on struct
type AccountSafe struct {
	Balance int
	mu      sync.Mutex
}

func (a *AccountSafe) Withdraw(amount int) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.Balance -= amount
}

// SAFE: Using channels instead of shared memory
func incrementWithChannel() int {
	counterCh := make(chan int, 1)
	counterCh <- 0

	var wg sync.WaitGroup
	for i := 0; i < 1000; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			current := <-counterCh
			counterCh <- current + 1
		}()
	}

	wg.Wait()
	return <-counterCh
}

// SAFE: Using sync.RWMutex for read-heavy operations
type Cache struct {
	data map[string]string
	mu   sync.RWMutex
}

func (c *Cache) Get(key string) (string, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	val, ok := c.data[key]
	return val, ok
}

func (c *Cache) Set(key, value string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data[key] = value
}

func main() {
	incrementCounterSafe()
	fmt.Println("Counter:", counter)

	account := &AccountSafe{Balance: 1000}
	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			account.Withdraw(50)
		}()
	}
	wg.Wait()
	fmt.Println("Balance:", account.Balance)
}
