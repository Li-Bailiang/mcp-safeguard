use sqlx::postgres::PgConnection;
use sqlx::Row;

// Safe: parameterized query with placeholders
async fn get_user_by_id_safe(conn: &mut PgConnection, user_id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("SELECT * FROM users WHERE id = $1")
        .bind(user_id)
        .execute(conn)
        .await?;
    Ok(())
}

// Safe: bind parameters instead of concatenation
async fn delete_user_safe(conn: &mut PgConnection, username: &str) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM users WHERE username = $1")
        .bind(username)
        .execute(conn)
        .await?;
    Ok(())
}

// Safe: parameterized update with multiple bindings
async fn update_email_safe(conn: &mut PgConnection, user_id: i32, email: &str) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE users SET email = $1 WHERE id = $2")
        .bind(email)
        .bind(user_id)
        .execute(conn)
        .await?;
    Ok(())
}

// Safe: compile-time checked query macro
async fn get_user_by_email_safe(conn: &mut PgConnection, email: &str) -> Result<Option<i32>, sqlx::Error> {
    let row = sqlx::query!("SELECT id FROM users WHERE email = $1", email)
        .fetch_optional(conn)
        .await?;

    Ok(row.map(|r| r.id))
}

// Safe: using query_as with bind
async fn find_users_safe(conn: &mut PgConnection, status: &str) -> Result<Vec<String>, sqlx::Error> {
    let rows = sqlx::query("SELECT username FROM users WHERE status = $1")
        .bind(status)
        .fetch_all(conn)
        .await?;

    Ok(rows.iter().map(|r| r.get("username")).collect())
}

// Safe: whitelist table names (if dynamic tables are needed)
async fn query_table_safe(conn: &mut PgConnection, table: &str, id: i32) -> Result<(), sqlx::Error> {
    let allowed_tables = ["users", "posts", "comments"];

    if !allowed_tables.contains(&table) {
        return Err(sqlx::Error::Configuration("Invalid table".into()));
    }

    // Still use parameterized query for the ID
    let query_str = format!("SELECT * FROM {} WHERE id = $1", table);
    sqlx::query(&query_str)
        .bind(id)
        .execute(conn)
        .await?;
    Ok(())
}
