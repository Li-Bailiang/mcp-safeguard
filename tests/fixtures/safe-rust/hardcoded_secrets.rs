use std::env;

// Safe: load from environment variables
fn get_api_key() -> Result<String, env::VarError> {
    env::var("API_KEY")
}

// Safe: load database password from env
fn get_database_password() -> Result<String, env::VarError> {
    env::var("DATABASE_PASSWORD")
}

// Safe: load auth token from env
fn get_auth_token() -> Result<String, env::VarError> {
    env::var("AUTH_TOKEN")
}

// Safe: load from config file (not hardcoded)
fn load_credentials_from_file() -> Result<Credentials, std::io::Error> {
    let config = std::fs::read_to_string("/etc/myapp/secrets.toml")?;
    // Parse config file
    Ok(Credentials::default())
}

#[derive(Default)]
struct Credentials {
    api_key: String,
    secret: String,
}

// Safe: use secret management service
async fn get_secret_from_vault(key: &str) -> Result<String, Box<dyn std::error::Error>> {
    // Fetch from HashiCorp Vault, AWS Secrets Manager, etc.
    let client = SecretClient::new();
    client.get_secret(key).await
}

struct SecretClient;

impl SecretClient {
    fn new() -> Self {
        Self
    }

    async fn get_secret(&self, _key: &str) -> Result<String, Box<dyn std::error::Error>> {
        // Implementation would connect to secret service
        Ok(String::new())
    }
}

// Safe: build connection string from env vars
fn get_database_url() -> Result<String, env::VarError> {
    let user = env::var("DB_USER")?;
    let pass = env::var("DB_PASSWORD")?;
    let host = env::var("DB_HOST")?;
    let db = env::var("DB_NAME")?;

    Ok(format!("postgres://{}:{}@{}/{}", user, pass, host, db))
}

// Safe: placeholder for local development (documented)
const DEFAULT_API_ENDPOINT: &str = "http://localhost:8080";

fn get_api_endpoint() -> String {
    env::var("API_ENDPOINT").unwrap_or_else(|_| DEFAULT_API_ENDPOINT.to_string())
}
