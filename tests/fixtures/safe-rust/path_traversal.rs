use std::fs::File;
use std::path::{Path, PathBuf};
use std::io::Read;

// Safe: validate and canonicalize paths
fn read_user_file_safe(base: &str, user_path: &str) -> std::io::Result<String> {
    let base_path = std::fs::canonicalize(base)?;
    let full_path = base_path.join(user_path);
    let canonical = std::fs::canonicalize(&full_path)?;

    // Ensure the canonical path is within base directory
    if !canonical.starts_with(&base_path) {
        return Err(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            "Path traversal attempt detected"
        ));
    }

    std::fs::read_to_string(canonical)
}

// Safe: validate path components
fn construct_path_safe(base: &str, component: &str) -> Result<PathBuf, String> {
    // Reject dangerous path components
    if component.contains("..") || component.contains('/') || component.contains('\\') {
        return Err("Invalid path component".to_string());
    }

    let mut path = PathBuf::from(base);
    path.push(component);
    Ok(path)
}

// Safe: whitelist approach
fn open_user_file_safe(filename: &str, allowed_dir: &Path) -> std::io::Result<File> {
    let path = allowed_dir.join(filename);
    let canonical = path.canonicalize()?;

    if !canonical.starts_with(allowed_dir) {
        return Err(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            "Access denied"
        ));
    }

    File::open(canonical)
}

// Safe: validate against allowed list
fn read_config_safe(config_name: &str) -> std::io::Result<Vec<u8>> {
    let allowed_configs = ["app.toml", "database.toml", "logging.toml"];

    if !allowed_configs.contains(&config_name) {
        return Err(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            "Config not allowed"
        ));
    }

    std::fs::read(Path::new("/etc/myapp/").join(config_name))
}

// Safe: sanitize filename
fn create_backup_path_safe(user_file: &str) -> Result<PathBuf, String> {
    // Remove any directory components
    let filename = Path::new(user_file)
        .file_name()
        .ok_or("Invalid filename")?;

    Ok(Path::new("/backups").join(filename))
}
