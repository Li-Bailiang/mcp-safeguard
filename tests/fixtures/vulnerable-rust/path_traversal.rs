use std::fs::File;
use std::path::{Path, PathBuf};
use std::io::Read;

// Vulnerable: path traversal with join
fn read_user_file_vulnerable(base: &str, user_path: &str) -> std::io::Result<String> {
    let path = PathBuf::from(base).join(user_path);
    std::fs::read_to_string(path)
}

// Vulnerable: PathBuf push with user input
fn construct_path_vulnerable(base: &str, component: &str) -> PathBuf {
    let mut path = PathBuf::from(base);
    path.push(component);
    path
}

// Vulnerable: File::open with user input
fn open_user_file_vulnerable(filename: &str) -> std::io::Result<File> {
    File::open(filename)
}

// Vulnerable: fs::read with untrusted path
fn read_config_vulnerable(config_name: &str) -> std::io::Result<Vec<u8>> {
    std::fs::read(config_name)
}

// Vulnerable: Path::new().join()
fn create_backup_path_vulnerable(user_file: &str) -> PathBuf {
    Path::new("/backups").join(user_file)
}

// Vulnerable: write to user-controlled path
fn save_user_data_vulnerable(path: &str, data: &[u8]) -> std::io::Result<()> {
    std::fs::write(path, data)
}
