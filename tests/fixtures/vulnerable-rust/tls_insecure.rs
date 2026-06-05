use reqwest::Client;

// Vulnerable: accepting invalid certificates
async fn create_insecure_client_vulnerable() -> Result<Client, reqwest::Error> {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()?;
    Ok(client)
}

// Vulnerable: accepting invalid hostnames
async fn create_client_no_hostname_verify() -> Result<Client, reqwest::Error> {
    let client = Client::builder()
        .danger_accept_invalid_hostnames(true)
        .build()?;
    Ok(client)
}

// Vulnerable: both checks disabled
async fn create_fully_insecure_client() -> Result<Client, reqwest::Error> {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .danger_accept_invalid_hostnames(true)
        .build()?;
    Ok(client)
}

// Vulnerable: HTTP instead of HTTPS
async fn fetch_user_data_vulnerable(user_id: &str) -> Result<String, reqwest::Error> {
    let url = format!("http://api.example.com/users/{}", user_id);
    let response = reqwest::get(&url).await?;
    response.text().await
}

// Vulnerable: hardcoded HTTP URL
const API_ENDPOINT: &str = "http://api.production.com/v1/";
