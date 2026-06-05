package main

import "fmt"

type User struct {
	Name  string
	Email string
}

// VULNERABLE: Nil pointer dereference without checking map value
func getUserEmail(users map[string]*User, id string) string {
	user := users[id]
	return user.Email // Panic if user not found
}

// VULNERABLE: Not checking ok value from map
func processUser(users map[string]*User, id string) {
	user, ok := users[id]
	_ = ok // Acknowledged but not checked
	fmt.Println(user.Name) // Still can panic
}

// VULNERABLE: Nil pointer from function return
func findUser(id string) (*User, error) {
	if id == "123" {
		return &User{Name: "Alice", Email: "alice@example.com"}, nil
	}
	return nil, fmt.Errorf("user not found")
}

func displayUser(id string) {
	user, err := findUser(id)
	// Not checking err before dereferencing
	fmt.Println(user.Name) // Panic if err != nil
	_ = err
}

func main() {
	users := make(map[string]*User)
	getUserEmail(users, "nonexistent")
}
