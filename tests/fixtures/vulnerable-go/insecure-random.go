package main

import (
	"fmt"
	"math/rand"
	"time"
)

// VULNERABLE: Using math/rand for session token
func generateSessionToken() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	token := make([]byte, 32)
	for i := range token {
		token[i] = charset[rand.Intn(len(charset))]
	}
	return string(token)
}

// VULNERABLE: Using math/rand for password reset token
func generateResetToken() string {
	return fmt.Sprintf("%d", rand.Int63())
}

// VULNERABLE: Predictable seed
func initRandom() {
	rand.Seed(time.Now().Unix())
}

// VULNERABLE: Using math/rand for cryptographic nonce
func generateNonce() []byte {
	nonce := make([]byte, 12)
	rand.Read(nonce)
	return nonce
}

func main() {
	initRandom()
	fmt.Println("Session token:", generateSessionToken())
	fmt.Println("Reset token:", generateResetToken())
}
