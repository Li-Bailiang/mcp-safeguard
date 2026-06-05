use std::fs::File;
use std::io::Write;

// Safe: proper error handling with ?
fn write_log_safe(message: &str) -> std::io::Result<()> {
    std::fs::write("/var/log/app.log", message)?;
    Ok(())
}

// Safe: handle Result explicitly
fn send_data_safe(data: &[u8]) -> Result<(), std::io::Error> {
    std::fs::write("/tmp/data.bin", data)
}

// Safe: check File::create result
fn create_file_safe(path: &str) -> std::io::Result<File> {
    File::create(path)
}

// Safe: handle error with match and provide default
fn read_config_safe(path: &str) -> String {
    match std::fs::read_to_string(path) {
        Ok(content) => content,
        Err(e) => {
            eprintln!("Failed to read config: {}", e);
            String::from("default_config")
        }
    }
}

// Safe: explicit error handling
fn process_file_safe(path: &str) -> std::io::Result<()> {
    let content = std::fs::read_to_string(path)?;
    println!("{}", content);
    Ok(())
}

// Safe: proper error propagation
fn handle_result_safe(path: &str) -> std::io::Result<String> {
    std::fs::read_to_string(path)
}

// Safe: log errors before defaulting
fn read_with_fallback_safe(path: &str) -> String {
    std::fs::read_to_string(path)
        .map_err(|e| eprintln!("Error reading {}: {}", path, e))
        .unwrap_or_default()
}

// Safe: use and_then for chaining
fn process_and_parse_safe(path: &str) -> Result<i32, Box<dyn std::error::Error>> {
    let content = std::fs::read_to_string(path)?;
    let number = content.trim().parse::<i32>()?;
    Ok(number)
}

// Safe: custom error handling
fn write_with_retry_safe(path: &str, data: &[u8]) -> Result<(), String> {
    std::fs::write(path, data)
        .map_err(|e| format!("Failed to write to {}: {}", path, e))
}

// Safe: Result with logging
fn create_directory_safe(path: &str) -> std::io::Result<()> {
    std::fs::create_dir_all(path).map_err(|e| {
        eprintln!("Failed to create directory {}: {}", path, e);
        e
    })
}
