use reqwest::Client;

// Safe: proper TLS verification (default behavior)
async fn create_secure_client_safe() -> Result<Client, reqwest::Error> {
    let client = Client::builder()
        .build()?;
    Ok(client)
}

// Safe: explicitly enable verification
async fn create_client_with_tls() -> Result<Client, reqwest::Error> {
    let client = Client::builder()
        .use_rustls_tls()
        .build()?;
    Ok(client)
}

// Safe: custom CA for self-signed certs (better than disabling)
async fn create_client_with_custom_ca() -> Result<Client, reqwest::Error> {
    let cert = std::fs::read("/path/to/custom-ca.pem")?;
    let cert = reqwest::Certificate::from_pem(&cert)?;

    let client = Client::builder()
        .add_root_certificate(cert)
        .build()?;
    Ok(client)
}

// Safe: HTTPS for external communication
async fn fetch_user_data_safe(user_id: &str) -> Result<String, reqwest::Error> {
    let url = format!("https://api.example.com/users/{}", user_id);
    let response = reqwest::get(&url).await?;
    response.text().await
}

// Safe: HTTPS for production API
const API_ENDPOINT: &str = "https://api.production.com/v1/";

// Safe: HTTP only for localhost development
async fn fetch_local_safe() -> Result<String, reqwest::Error> {
    let response = reqwest::get("http://localhost:8080/health").await?;
    response.text().await
}

// Safe: conditional TLS verification for testing only
async fn create_test_client(allow_self_signed: bool) -> Result<Client, reqwest::Error> {
    let mut builder = Client::builder();

    // Only disable verification in test environment
    #[cfg(test)]
    if allow_self_signed {
        builder = builder.danger_accept_invalid_certs(true);
    }

    builder.build()
}
