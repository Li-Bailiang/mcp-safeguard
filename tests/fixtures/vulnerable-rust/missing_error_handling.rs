use std::fs::File;
use std::io::Write;

// Vulnerable: ignored Result with let _
fn write_log_vulnerable(message: &str) {
    let _ = std::fs::write("/var/log/app.log", message);
}

// Vulnerable: Result ignored completely
fn send_data_vulnerable(data: &[u8]) {
    std::fs::write("/tmp/data.bin", data);
}

// Vulnerable: File::create result ignored
fn create_file_vulnerable(path: &str) {
    File::create(path);
}

// Vulnerable: unwrap_or_default hides errors
fn read_config_vulnerable(path: &str) -> String {
    std::fs::read_to_string(path).unwrap_or_default()
}

// Vulnerable: error explicitly ignored
fn process_file_vulnerable(path: &str) {
    if let Ok(content) = std::fs::read_to_string(path) {
        println!("{}", content);
    }
}

// Vulnerable: match with empty error handler
fn handle_result_vulnerable(path: &str) -> String {
    match std::fs::read_to_string(path) {
        Ok(content) => content,
        Err(_) => String::new(),
    }
}
