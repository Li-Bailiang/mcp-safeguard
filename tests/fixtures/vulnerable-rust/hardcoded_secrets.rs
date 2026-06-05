// Vulnerable: hardcoded API key
const API_KEY: &str = "EXAMPLE_API_KEY_DO_NOT_USE";

// Vulnerable: hardcoded password
static DATABASE_PASSWORD: &str = "SuperSecret123!";

// Vulnerable: hardcoded auth token
const AUTH_TOKEN: &str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";

// Vulnerable: hardcoded private key
const PRIVATE_KEY: &str = "EXAMPLE_PRIVATE_KEY_DO_NOT_USE";

// Vulnerable: hardcoded secret key
fn get_jwt_secret() -> &'static str {
    let jwt_secret = "my-super-secret-key-12345";
    jwt_secret
}

// Vulnerable: database connection string with credentials
const DATABASE_URL: &str = "postgres://admin:password123@localhost/mydb";

// Vulnerable: hardcoded bearer token
const BEARER_TOKEN: &str = "bearer_abc123def456ghi789";

// Vulnerable: base64 encoded secret (pattern detection)
const ENCODED_SECRET: &str = "YWRtaW46cGFzc3dvcmQxMjM0NTY3ODkwYWJjZGVm";

// Vulnerable: hex secret pattern
static HEX_SECRET: &str = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";

// Vulnerable: MySQL connection with password
const MYSQL_CONNECTION: &str = "mysql://root:rootpass@localhost:3306/app";
