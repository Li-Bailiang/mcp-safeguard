use std::process::Command;

// Vulnerable: command injection with format!
fn execute_with_user_input_vulnerable(filename: &str) -> std::io::Result<()> {
    Command::new("cat").arg(format!("/var/log/{}", filename)).spawn()?;
    Ok(())
}

// Vulnerable: shell command with user input
fn run_shell_command_vulnerable(user_cmd: &str) -> std::io::Result<()> {
    Command::new("sh")
        .arg("-c")
        .arg(user_cmd)
        .spawn()?;
    Ok(())
}

// Vulnerable: bash with user input
fn backup_file_vulnerable(filename: &str) -> std::io::Result<()> {
    let cmd = format!("cp {} /backup/", filename);
    Command::new("bash")
        .arg("-c")
        .arg(&cmd)
        .spawn()?;
    Ok(())
}

// Vulnerable: command name from variable
fn execute_dynamic_command(program: &str, args: &[&str]) -> std::io::Result<()> {
    let mut cmd = Command::new(program);
    for arg in args {
        cmd.arg(arg);
    }
    cmd.spawn()?;
    Ok(())
}

// Vulnerable: PowerShell injection on Windows
fn run_powershell_vulnerable(script: &str) -> std::io::Result<()> {
    Command::new("powershell")
        .arg("-Command")
        .arg(script)
        .spawn()?;
    Ok(())
}
