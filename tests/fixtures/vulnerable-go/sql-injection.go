package main

import (
	"database/sql"
	"fmt"
	"net/http"
)

// VULNERABLE: SQL injection via fmt.Sprintf
func getUserByID(db *sql.DB, userID string) error {
	query := fmt.Sprintf("SELECT * FROM users WHERE id = '%s'", userID)
	rows, err := db.Query(query)
	if err != nil {
		return err
	}
	defer rows.Close()
	return nil
}

// VULNERABLE: SQL injection via string concatenation
func searchUsers(db *sql.DB, searchTerm string) error {
	query := "SELECT * FROM users WHERE name LIKE '%" + searchTerm + "%'"
	_, err := db.Exec(query)
	return err
}

// VULNERABLE: SQL injection in prepared statement
func deleteUser(db *sql.DB, userID string) error {
	stmt, err := db.Prepare(fmt.Sprintf("DELETE FROM users WHERE id = %s", userID))
	if err != nil {
		return err
	}
	defer stmt.Close()
	_, err = stmt.Exec()
	return err
}

func handler(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	userID := r.URL.Query().Get("id")
	getUserByID(db, userID)
}
