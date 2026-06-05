use rand::rngs::OsRng;
use rand::RngCore;

// Safe: using OsRng for cryptographic randomness
fn generate_session_token_safe() -> String {
    let mut rng = OsRng;
    let mut bytes = [0u8; 32];
    rng.fill_bytes(&mut bytes);

    bytes.iter()
        .map(|b| format!("{:02x}", b))
        .collect()
}

// Safe: OsRng for API keys
fn generate_api_key_safe() -> [u8; 32] {
    let mut key = [0u8; 32];
    OsRng.fill_bytes(&mut key);
    key
}

// Safe: from_entropy for StdRng
fn generate_password_safe() -> String {
    use rand::rngs::StdRng;
    use rand::SeedableRng;
    use rand::distributions::{Alphanumeric, DistString};

    let mut rng = StdRng::from_entropy();
    Alphanumeric.sample_string(&mut rng, 16)
}

// Safe: getrandom crate for cryptographic operations
fn generate_encryption_key_safe() -> [u8; 32] {
    let mut key = [0u8; 32];
    getrandom::getrandom(&mut key).expect("Failed to get random bytes");
    key
}

// Safe: OsRng for nonce generation
fn generate_nonce_safe() -> [u8; 12] {
    let mut nonce = [0u8; 12];
    OsRng.fill_bytes(&mut nonce);
    nonce
}

// Safe: thread_rng is OK for non-security purposes
fn shuffle_list_safe<T>(items: &mut [T]) {
    use rand::seq::SliceRandom;
    items.shuffle(&mut rand::thread_rng());
}

// Safe: using crypto_rand alias
fn generate_salt_safe() -> [u8; 16] {
    use rand::rngs::OsRng as CryptoRng;
    let mut salt = [0u8; 16];
    CryptoRng.fill_bytes(&mut salt);
    salt
}
