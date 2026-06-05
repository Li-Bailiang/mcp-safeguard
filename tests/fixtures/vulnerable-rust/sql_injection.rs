use sqlx::postgres::PgConnection;

// Vulnerable: SQL injection with format!
async fn get_user_by_id_vulnerable(conn: &mut PgConnection, user_id: &str) -> Result<(), sqlx::Error> {
    let query = format!("SELECT * FROM users WHERE id = '{}'", user_id);
    sqlx::query(&query).execute(conn).await?;
    Ok(())
}

// Vulnerable: SQL injection with string concatenation
async fn delete_user_vulnerable(conn: &mut PgConnection, username: &str) -> Result<(), sqlx::Error> {
    let query = "DELETE FROM users WHERE username = '".to_string() + username + "'";
    sqlx::query(&query).execute(conn).await?;
    Ok(())
}

// Vulnerable: format! in execute
async fn update_email_vulnerable(conn: &mut PgConnection, user_id: i32, email: &str) -> Result<(), sqlx::Error> {
    conn.execute(format!("UPDATE users SET email = '{}' WHERE id = {}", email, user_id)).await?;
    Ok(())
}

// Vulnerable: prepare with format!
async fn prepare_query_vulnerable(conn: &mut PgConnection, table: &str) -> Result<(), sqlx::Error> {
    let stmt = conn.prepare(format!("SELECT * FROM {}", table)).await?;
    Ok(())
}
