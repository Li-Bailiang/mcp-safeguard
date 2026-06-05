use std::process::Command;
use std::ffi::OsStr;

// Safe: separate arguments instead of formatting
fn execute_with_user_input_safe(filename: &str) -> std::io::Result<()> {
    Command::new("cat")
        .arg("/var/log/")
        .arg(filename)
        .spawn()?;
    Ok(())
}

// Safe: avoid shell, use direct program execution
fn run_command_safe(args: &[&str]) -> std::io::Result<()> {
    if args.is_empty() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "No command provided"
        ));
    }

    Command::new(args[0])
        .args(&args[1..])
        .spawn()?;
    Ok(())
}

// Safe: whitelist allowed programs
fn execute_whitelisted_command(program: &str, args: &[&str]) -> std::io::Result<()> {
    let allowed = ["ls", "cat", "grep", "find"];

    if !allowed.contains(&program) {
        return Err(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            "Command not allowed"
        ));
    }

    Command::new(program)
        .args(args)
        .spawn()?;
    Ok(())
}

// Safe: use hardcoded command name, separate args
fn backup_file_safe(source: &str, dest: &str) -> std::io::Result<()> {
    Command::new("cp")
        .arg("--")
        .arg(source)
        .arg(dest)
        .spawn()?;
    Ok(())
}

// Safe: validate filename before use
fn process_log_file_safe(filename: &str) -> std::io::Result<()> {
    // Only allow alphanumeric and specific characters
    if !filename.chars().all(|c| c.is_alphanumeric() || c == '.' || c == '-' || c == '_') {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "Invalid filename"
        ));
    }

    Command::new("cat")
        .arg("/var/log/")
        .arg(filename)
        .spawn()?;
    Ok(())
}

// Safe: use OsStr to prevent injection
fn execute_with_osstr<S: AsRef<OsStr>>(program: S, args: &[S]) -> std::io::Result<()> {
    Command::new(program)
        .args(args)
        .spawn()?;
    Ok(())
}
