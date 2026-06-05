package main

import (
	"database/sql"
	"fmt"
)

// VULNERABLE: Hardcoded API key
const API_KEY = "EXAMPLE_API_KEY_DO_NOT_USE"
const ApiToken = "EXAMPLE_GITHUB_TOKEN_DO_NOT_USE"

// VULNERABLE: Hardcoded password
var PASSWORD = "SuperSecret123!"
var database_password = "myDbP@ssw0rd"

// VULNERABLE: Hardcoded credentials in connection string
func connectDB() (*sql.DB, error) {
	const connectionString = "postgres://admin:admin123@localhost/mydb"
	return sql.Open("postgres", connectionString)
}

// VULNERABLE: Hardcoded AWS credentials
type Config struct {
	AccessKey string
	SecretKey string
}

func getAWSConfig() Config {
	return Config{
		AccessKey: "EXAMPLE_AWS_ACCESS_KEY_ID",
		SecretKey: "EXAMPLE_AWS_SECRET_ACCESS_KEY_DO_NOT_USE",
	}
}

func main() {
	fmt.Println("API Key:", API_KEY)
}
