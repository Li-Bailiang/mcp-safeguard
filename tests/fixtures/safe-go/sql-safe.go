package main

import (
	"database/sql"
	"net/http"
)

// SAFE: Parameterized query
func getUserByIDSafe(db *sql.DB, userID string) error {
	query := "SELECT * FROM users WHERE id = ?"
	rows, err := db.Query(query, userID)
	if err != nil {
		return err
	}
	defer rows.Close()
	return nil
}

// SAFE: Using placeholders for LIKE queries
func searchUsersSafe(db *sql.DB, searchTerm string) error {
	query := "SELECT * FROM users WHERE name LIKE ?"
	_, err := db.Exec(query, "%"+searchTerm+"%")
	return err
}

// SAFE: Prepared statement with parameters
func deleteUserSafe(db *sql.DB, userID string) error {
	stmt, err := db.Prepare("DELETE FROM users WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()
	_, err = stmt.Exec(userID)
	return err
}

// SAFE: Multiple parameters
func updateUserSafe(db *sql.DB, userID, name, email string) error {
	query := "UPDATE users SET name = ?, email = ? WHERE id = ?"
	_, err := db.Exec(query, name, email, userID)
	return err
}

func handlerSafe(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	userID := r.URL.Query().Get("id")
	if err := getUserByIDSafe(db, userID); err != nil {
		http.Error(w, "Error", 500)
	}
}
