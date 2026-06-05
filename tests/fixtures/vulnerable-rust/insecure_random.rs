use rand::Rng;

// Vulnerable: using thread_rng for security-sensitive operations
fn generate_session_token_vulnerable() -> String {
    let mut rng = rand::thread_rng();
    (0..32)
        .map(|_| format!("{:02x}", rng.gen::<u8>()))
        .collect()
}

// Vulnerable: rand::random for crypto
fn generate_api_key_vulnerable() -> u64 {
    rand::random()
}

// Vulnerable: StdRng with predictable seed
fn generate_password_vulnerable() -> String {
    use rand::rngs::StdRng;
    use rand::SeedableRng;

    let mut rng = StdRng::seed_from_u64(0);
    (0..16)
        .map(|_| rng.gen::<u8>() as char)
        .collect()
}

// Vulnerable: fastrand for cryptographic purposes
fn generate_encryption_key_vulnerable() -> Vec<u8> {
    (0..32).map(|_| fastrand::u8(..)).collect()
}

// Vulnerable: thread_rng for nonce generation
fn generate_nonce_vulnerable() -> [u8; 12] {
    let mut nonce = [0u8; 12];
    rand::thread_rng().fill(&mut nonce);
    nonce
}
