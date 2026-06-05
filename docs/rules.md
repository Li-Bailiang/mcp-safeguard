# MCP-Safeguard Security Rules

This document describes all security rules included in MCP-Safeguard.

## Categories

MCP-Safeguard includes **170 rules** in total:

- **57 MCP-focused rules** across 8 categories (MCP Threats, Supply Chain, Shadow
  Server, Indirect Injection, Excessive Agency, Context Overshare, Typosquatting, DoS)
- **25 infrastructure rules** (Dockerfile, Kubernetes, MCP config)
- **88 general-purpose SAST rules**: Go (27), Java (32), Rust (29) — loaded only
  when that language is present in the scan target

The MCP and language categories are documented below. (Infrastructure and Java
rules are validated by the test suite but not individually listed here yet.)

### 1. MCP Threats (6 rules)

Attacks specific to the Model Context Protocol. These inspect the modern
`McpServer.tool()` / `registerTool()` API (and Python `mcp.tool(...)`), not just
variable names.

#### mcp-tool-poisoning

Flags a tool **description** that contains hidden instruction-like text (e.g.
"ignore previous instructions", "read ~/.ssh/id_rsa", `<IMPORTANT>`). The model
treats descriptions as trusted context, so this is a prompt-injection vector.
Severity: ERROR. (`mcp-python-tool-poisoning` covers Python.)

#### mcp-tool-description-dynamic

Flags a tool description computed at runtime (a function call, `await`, or
property lookup) rather than a static literal — a "rug-pull" risk where the
description shown at approval can change later. Severity: WARNING.

#### mcp-cross-server-shadowing

Flags a description that references or overrides other tools/servers ("use this
instead of X", "ignore the official tool") — cross-server shadowing / confused
deputy. Severity: ERROR. (`mcp-python-cross-server-shadowing` covers Python.)

#### mcp-credential-passthrough

Flags a `process.env` secret forwarded into an outbound request's
`Authorization` / API-key header — leaking server credentials to a possibly
user-controlled destination. Severity: ERROR.

### 2. Supply Chain (6 rules)

Rules detecting suspicious package usage and dependency risks.

#### mcp-suspicious-exec-package
- **Severity**: ERROR
- **Description**: Suspicious use of child_process exec functions without proper sanitization
- **CWE**: CWE-78 (OS Command Injection)
- **OWASP**: A03:2021 (Injection)

#### mcp-suspicious-eval
- **Severity**: ERROR
- **Description**: Dangerous use of eval() function
- **CWE**: CWE-95 (Improper Neutralization of Directives in Dynamically Evaluated Code)
- **OWASP**: A03:2021 (Injection)

#### mcp-suspicious-vm-runInNewContext
- **Severity**: WARNING
- **Description**: Use of vm.runInNewContext with untrusted code
- **CWE**: CWE-94 (Improper Control of Generation of Code)

#### mcp-python-subprocess-shell
- **Severity**: ERROR
- **Description**: Subprocess call with shell=True is dangerous
- **CWE**: CWE-78 (OS Command Injection)
- **OWASP**: A03:2021 (Injection)

#### mcp-python-exec-eval
- **Severity**: ERROR
- **Description**: Use of exec() or eval() with dynamic input
- **CWE**: CWE-95 (Improper Neutralization of Directives in Dynamically Evaluated Code)

#### mcp-dynamic-import
- **Severity**: WARNING
- **Description**: Dynamic import with user-controlled input
- **CWE**: CWE-829 (Inclusion of Functionality from Untrusted Control Sphere)

### 3. Shadow Server (11 rules)

Rules for detecting insecure server configurations.

#### JavaScript/TypeScript (7 rules)

- **mcp-server-no-auth**: Server running without authentication (ERROR)
- **mcp-server-insecure-transport**: Using insecure transport (WARNING)
- **mcp-hardcoded-credentials**: Hardcoded credentials (ERROR)
- **mcp-unrestricted-cors**: CORS with wildcard origin (WARNING)
- **mcp-disabled-tls-verification**: TLS verification disabled (ERROR)
- **mcp-excessive-permissions**: Tool with excessive permissions (WARNING)
- **mcp-debug-mode-production**: Debug mode in production (WARNING)

#### Python (4 rules)

- **mcp-python-server-no-auth**: Server without authentication (ERROR)
- **mcp-python-hardcoded-secrets**: Hardcoded credentials (ERROR)
- **mcp-python-ssl-disabled**: SSL verification disabled (ERROR)
- **mcp-python-debug-enabled**: Debug mode enabled (WARNING)

### 4. Indirect Injection (8 rules)

Rules detecting external content handling risks.

#### mcp-unsanitized-url-fetch
- **Severity**: WARNING
- **Description**: Fetching external content without validation
- **CWE**: CWE-918 (Server-Side Request Forgery)
- **OWASP**: A10:2021 (Server-Side Request Forgery)

#### mcp-python-unsanitized-fetch
- **Severity**: WARNING
- **Description**: Fetching external content without validation (Python)
- **CWE**: CWE-918 (SSRF)

#### mcp-prompt-injection-risk
- **Severity**: ERROR
- **Description**: External content used in LLM prompt without sanitization
- **CWE**: CWE-74 (Improper Neutralization of Special Elements)

#### mcp-unvalidated-file-read
- **Severity**: ERROR
- **Description**: Reading file with user-controlled path
- **CWE**: CWE-22 (Path Traversal)
- **OWASP**: A01:2021 (Broken Access Control)

#### mcp-python-path-traversal
- **Severity**: ERROR
- **Description**: File operation with user-controlled path (Python)
- **CWE**: CWE-22 (Path Traversal)

#### mcp-xml-external-entities
- **Severity**: ERROR
- **Description**: XML parsing without disabling external entities
- **CWE**: CWE-611 (Improper Restriction of XML External Entity Reference)
- **OWASP**: A05:2021 (Security Misconfiguration)

#### mcp-sql-injection-risk
- **Severity**: ERROR
- **Description**: Potential SQL injection with string concatenation
- **CWE**: CWE-89 (SQL Injection)
- **OWASP**: A03:2021 (Injection)

#### mcp-python-sql-injection
- **Severity**: ERROR
- **Description**: SQL query constructed with string formatting (Python)
- **CWE**: CWE-89 (SQL Injection)

### 5. Excessive Agency (8 rules)

Rules for autonomous actions without validation.

- **mcp-tool-no-confirmation**: Destructive tool without confirmation (ERROR)
- **mcp-automatic-file-deletion**: Automatic file deletion (ERROR)
- **mcp-python-automatic-deletion**: Automatic deletion in Python (ERROR)
- **mcp-unrestricted-network-access**: Unrestricted network access (WARNING)
- **mcp-automatic-code-execution**: Automatic code execution (ERROR)
- **mcp-python-automatic-execution**: Automatic execution in Python (ERROR)
- **mcp-unrestricted-file-write**: Unrestricted file write (WARNING)
- **mcp-python-unrestricted-write**: Unrestricted write in Python (WARNING)

### 6. Context Overshare (7 rules)

Rules for excessive data sharing.

- **mcp-resource-exposes-env**: Exposing environment variables (ERROR)
- **mcp-excessive-file-access**: Excessive file system access (WARNING)
- **mcp-python-env-exposure**: Environment exposure in Python (ERROR)
- **mcp-credential-in-prompt**: Credentials in prompt template (ERROR)
- **mcp-excessive-logging**: Sensitive data logging (WARNING)
- **mcp-python-excessive-logging**: Excessive logging in Python (WARNING)
- **mcp-pii-exposure**: Potential PII exposure (WARNING)

### 7. Typosquatting (4 rules)

Rules for package name hijacking detection.

- **mcp-suspicious-package-name**: Package name similar to popular MCP packages (WARNING)
- **mcp-python-typosquatting**: Suspicious package import in Python (WARNING)
- **mcp-namespace-confusion**: Confusing namespace (INFO)
- **mcp-homoglyph-attack**: Unicode homoglyphs in package name (WARNING)

### 8. DoS (7 rules)

Rules for resource exhaustion vulnerabilities.

- **mcp-unbounded-loop**: Unbounded loop without limits (WARNING)
- **mcp-python-unbounded-loop**: Unbounded loop in Python (WARNING)
- **mcp-uncontrolled-recursion**: Recursive function without depth limit (WARNING)
- **mcp-large-file-processing**: Processing large files without size limits (WARNING)
- **mcp-python-large-file**: Reading entire file into memory (WARNING)
- **mcp-regex-dos**: Regular expression vulnerable to ReDoS (WARNING)
- **mcp-uncontrolled-memory-allocation**: Memory allocation without limit (WARNING)

### 9. Go Security (27 rules)

Comprehensive security rules for Go language applications.

#### Concurrency Issues (5 rules)

- **go-goroutine-no-sync**: Goroutine started without synchronization (WaitGroup/channel) (WARNING)
- **go-goroutine-in-main-no-sync**: Goroutine in main() without synchronization (ERROR)
- **go-goroutine-leak**: Goroutine with infinite loop without context cancellation (ERROR)
- **go-race-condition**: Shared variable accessed without mutex/channel synchronization (ERROR)
- **go-panic-in-goroutine**: panic() in goroutine without recover() (ERROR)

#### Injection Vulnerabilities (4 rules)

- **go-sql-injection**: SQL query with fmt.Sprintf or string concatenation (ERROR)
  - **CWE**: CWE-89 (SQL Injection)
  - **OWASP**: A03:2021 (Injection)
  - **Example Vulnerable**:
    ```go
    query := fmt.Sprintf("SELECT * FROM users WHERE id = '%s'", userID)
    db.Query(query)
    ```
  - **Example Safe**:
    ```go
    db.Query("SELECT * FROM users WHERE id = ?", userID)
    ```

- **go-sql-injection-prepare**: SQL prepared statement with string formatting (ERROR)
- **go-command-injection**: Command execution via shell with concatenated input (ERROR)
  - **CWE**: CWE-78 (OS Command Injection)
  - **OWASP**: A03:2021 (Injection)
  - **Example Vulnerable**:
    ```go
    exec.Command("sh", "-c", "ping "+host)
    ```
  - **Example Safe**:
    ```go
    exec.Command("ping", "-c", "4", host)
    ```

- **go-command-injection-direct**: Command with concatenated arguments (WARNING)

#### Path Traversal (1 rule)

- **go-path-traversal**: File path constructed with user input without sanitization (ERROR)
  - **CWE**: CWE-22 (Path Traversal)
  - **OWASP**: A01:2021 (Broken Access Control)
  - **Example Vulnerable**:
    ```go
    path := filepath.Join("/var/data", userInput)
    ioutil.ReadFile(path) // User can provide "../../../etc/passwd"
    ```
  - **Example Safe**:
    ```go
    path := filepath.Join("/var/data", filepath.Clean(userInput))
    if !strings.HasPrefix(path, "/var/data/") {
        return errors.New("invalid path")
    }
    ioutil.ReadFile(path)
    ```

#### Cryptographic Issues (2 rules)

- **go-insecure-random**: Using math/rand for security-sensitive operations (ERROR)
  - **CWE**: CWE-338 (Use of Cryptographically Weak PRNG)
  - **OWASP**: A02:2021 (Cryptographic Failures)
  - **Example Vulnerable**:
    ```go
    token := make([]byte, 32)
    rand.Read(token) // math/rand is predictable
    ```
  - **Example Safe**:
    ```go
    import "crypto/rand"
    token := make([]byte, 32)
    rand.Read(token)
    ```

- **go-math-rand-seed**: Predictable seed for math/rand (WARNING)

#### TLS/SSL Issues (2 rules)

- **go-tls-skip-verify**: TLS certificate verification disabled (ERROR)
  - **CWE**: CWE-295 (Improper Certificate Validation)
  - **OWASP**: A02:2021 (Cryptographic Failures)
  - **Example Vulnerable**:
    ```go
    client := &http.Client{
        Transport: &http.Transport{
            TLSClientConfig: &tls.Config{
                InsecureSkipVerify: true,
            },
        },
    }
    ```
  - **Example Safe**:
    ```go
    client := &http.Client{} // Uses default secure TLS config
    ```

- **go-http-client-no-tls-verify**: HTTP client with disabled TLS verification (ERROR)

#### Resource Management (4 rules)

- **go-defer-in-loop**: defer in loop accumulates until function returns (ERROR)
  - **CWE**: CWE-772 (Missing Release of Resource)
  - **Example Vulnerable**:
    ```go
    for _, filename := range files {
        f, _ := os.Open(filename)
        defer f.Close() // Won't execute until function returns!
    }
    ```
  - **Example Safe**:
    ```go
    for _, filename := range files {
        func() {
            f, _ := os.Open(filename)
            defer f.Close() // Executes at end of anonymous function
            // Process file
        }()
    }
    ```

- **go-defer-file-close-in-loop**: Deferring file.Close() in loop (ERROR)
- **go-context-cancel-not-called**: context.WithCancel without defer cancel() (ERROR)
- **go-context-timeout-not-called**: context.WithTimeout/WithDeadline without defer cancel() (ERROR)

#### Error Handling (2 rules)

- **go-unhandled-error-file-ops**: File operation error ignored (WARNING)
  - **CWE**: CWE-252 (Unchecked Return Value)
  - **Example Vulnerable**:
    ```go
    file.Write(data) // Error ignored
    ```
  - **Example Safe**:
    ```go
    if _, err := file.Write(data); err != nil {
        return err
    }
    ```

- **go-unhandled-error-defer-close**: Deferred Close() error ignored (INFO)

#### Memory Safety (3 rules)

- **go-nil-pointer-dereference**: Potential nil pointer dereference without check (WARNING)
  - **CWE**: CWE-476 (NULL Pointer Dereference)
  - **Example Vulnerable**:
    ```go
    user := users[id]
    fmt.Println(user.Name) // Panic if user not found
    ```
  - **Example Safe**:
    ```go
    user, ok := users[id]
    if !ok {
        return errors.New("user not found")
    }
    fmt.Println(user.Name)
    ```

- **go-nil-pointer-return**: Nil pointer dereference on function return without error check (WARNING)
- **go-unsafe-pointer-conversion**: unsafe.Pointer usage bypasses type safety (WARNING)
- **go-unsafe-string-bytes-conversion**: Unsafe string-to-bytes conversion (ERROR)
- **go-unsafe-reflect-header**: Deprecated reflect.SliceHeader/StringHeader usage (WARNING)

#### Hardcoded Secrets (2 rules)

- **go-hardcoded-api-key**: Hardcoded API key, token, or password detected (ERROR)
  - **CWE**: CWE-798 (Use of Hard-coded Credentials)
  - **OWASP**: A07:2021 (Identification and Authentication Failures)
  - **Example Vulnerable**:
    ```go
    const API_KEY = "EXAMPLE_API_KEY_DO_NOT_USE"
    ```
  - **Example Safe**:
    ```go
    apiKey := os.Getenv("API_KEY")
    ```

- **go-hardcoded-secret-pattern**: Potential hardcoded secret pattern detected (WARNING)

### 10. Rust Security (29 rules)

Comprehensive security rules for Rust language applications.

#### Unsafe Code (2 rules)

- **rust-unsafe-without-comment**: Unsafe block without safety documentation comment (WARNING)
  - **CWE**: CWE-758 (Reliance on Undefined, Unspecified, or Implementation-Defined Behavior)
  - **OWASP**: A04:2021 (Insecure Design)
  - **Example Vulnerable**:
    ```rust
    unsafe {
        *raw_ptr
    }
    ```
  - **Example Safe**:
    ```rust
    // SAFETY: The caller guarantees that `raw_ptr` is valid, properly aligned,
    // and points to an initialized value
    unsafe {
        *raw_ptr
    }
    ```

- **rust-unsafe-function-without-comment**: Unsafe function without safety documentation (WARNING)

#### Error Handling (5 rules)

- **rust-unwrap-panic**: Using .unwrap() or .expect() can cause panics (WARNING)
  - **CWE**: CWE-703 (Improper Check or Handling of Exceptional Conditions)
  - **OWASP**: A04:2021 (Insecure Design)
  - **Example Vulnerable**:
    ```rust
    let value = some_result.unwrap();
    ```
  - **Example Safe**:
    ```rust
    let value = some_result?;
    // or
    let value = match some_result {
        Ok(v) => v,
        Err(e) => return Err(e),
    };
    ```

- **rust-unwrap-or-default-on-result**: Using .unwrap_or_default() on Result silently ignores errors (WARNING)
- **rust-unwrap-unchecked**: Using unwrap_unchecked() bypasses safety checks (ERROR)
- **rust-ignored-result**: Result type ignored without error handling (WARNING)
- **rust-ok-unwrap-chain**: Chaining .ok().unwrap() defeats error handling (WARNING)
- **rust-error-ignored-underscore**: Error explicitly ignored with underscore pattern (INFO)

#### Integer Overflow (2 rules)

- **rust-unchecked-arithmetic**: Unchecked arithmetic operation can cause overflow/underflow (WARNING)
  - **CWE**: CWE-190 (Integer Overflow), CWE-191 (Integer Underflow)
  - **OWASP**: A04:2021 (Insecure Design)
  - **Example Vulnerable**:
    ```rust
    let total = price * quantity; // Can overflow
    ```
  - **Example Safe**:
    ```rust
    let total = price.checked_mul(quantity)?;
    ```

- **rust-as-integer-cast**: Integer cast with 'as' can silently truncate or overflow (WARNING)

#### Injection Vulnerabilities (6 rules)

- **rust-sql-injection-format**: SQL query built with format!() macro (ERROR)
  - **CWE**: CWE-89 (SQL Injection)
  - **OWASP**: A03:2021 (Injection)
  - **Example Vulnerable**:
    ```rust
    let query = format!("SELECT * FROM users WHERE id = '{}'", user_id);
    conn.execute(&query, []).await?;
    ```
  - **Example Safe**:
    ```rust
    sqlx::query("SELECT * FROM users WHERE id = $1")
        .bind(user_id)
        .execute(conn)
        .await?;
    ```

- **rust-sql-injection-concat**: SQL query with string concatenation (ERROR)
- **rust-sql-raw-query**: Raw SQL query with user input may be vulnerable (WARNING)
- **rust-command-injection-format**: Command execution with format!() and user input (ERROR)
  - **CWE**: CWE-78 (OS Command Injection)
  - **OWASP**: A03:2021 (Injection)
  - **Example Vulnerable**:
    ```rust
    Command::new("cat").arg(format!("/var/log/{}", filename)).spawn()?;
    ```
  - **Example Safe**:
    ```rust
    Command::new("cat").arg("/var/log/").arg(filename).spawn()?;
    ```

- **rust-shell-command-injection**: Executing shell command with user input (ERROR)
- **rust-command-output-string**: Constructing command from string variable (WARNING)

#### Path Traversal (3 rules)

- **rust-path-traversal**: Path constructed with untrusted input without sanitization (ERROR)
  - **CWE**: CWE-22 (Path Traversal)
  - **OWASP**: A01:2021 (Broken Access Control)
  - **Example Vulnerable**:
    ```rust
    let path = base_dir.join(user_input);
    std::fs::read_to_string(path)?;
    ```
  - **Example Safe**:
    ```rust
    let path = base_dir.join(user_input);
    let canonical = path.canonicalize()?;
    if !canonical.starts_with(&base_dir) {
        return Err("path traversal detected");
    }
    std::fs::read_to_string(canonical)?;
    ```

- **rust-file-open-user-input**: Opening file with user-controlled path without validation (ERROR)
- **rust-path-components-unsafe**: Using push() with user input on PathBuf (WARNING)

#### Cryptographic Issues (3 rules)

- **rust-insecure-random-crypto**: Using rand::thread_rng() for cryptographic purposes (ERROR)
  - **CWE**: CWE-338 (Use of Cryptographically Weak PRNG)
  - **OWASP**: A02:2021 (Cryptographic Failures)
  - **Example Vulnerable**:
    ```rust
    let mut rng = rand::thread_rng();
    let token: u64 = rng.gen();
    ```
  - **Example Safe**:
    ```rust
    use rand::rngs::OsRng;
    let mut rng = OsRng;
    let mut token = [0u8; 32];
    rng.fill_bytes(&mut token);
    ```

- **rust-weak-rng-seed**: StdRng or SmallRng with predictable seed (WARNING)
- **rust-fastrand-crypto**: fastrand is not cryptographically secure (ERROR)

#### TLS/SSL Issues (4 rules)

- **rust-tls-accept-invalid-certs**: TLS certificate verification disabled (ERROR)
  - **CWE**: CWE-295 (Improper Certificate Validation)
  - **OWASP**: A02:2021 (Cryptographic Failures)
  - **Example Vulnerable**:
    ```rust
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()?;
    ```
  - **Example Safe**:
    ```rust
    let client = Client::builder().build()?;
    ```

- **rust-tls-accept-invalid-hostnames**: TLS hostname verification disabled (ERROR)
- **rust-native-tls-no-verification**: TLS connector without certificate verification (ERROR)
- **rust-http-instead-of-https**: HTTP URL instead of HTTPS (WARNING)

#### Hardcoded Secrets (3 rules)

- **rust-hardcoded-api-key**: Hardcoded API key or token detected (ERROR)
  - **CWE**: CWE-798 (Use of Hard-coded Credentials)
  - **OWASP**: A07:2021 (Identification and Authentication Failures)
  - **Example Vulnerable**:
    ```rust
    const API_KEY: &str = "EXAMPLE_API_KEY_DO_NOT_USE";
    ```
  - **Example Safe**:
    ```rust
    let api_key = std::env::var("API_KEY")?;
    ```

- **rust-hardcoded-secret-pattern**: Potential hardcoded secret pattern (base64/hex) (WARNING)
- **rust-database-password-hardcoded**: Database connection string with hardcoded credentials (ERROR)

## Severity Levels

- **ERROR**: High-severity issues that should be fixed immediately
- **WARNING**: Medium-severity issues that should be reviewed
- **INFO**: Low-severity issues for awareness

## Confidence Ratings

- **HIGH**: Very likely to be a real issue
- **MEDIUM**: Likely to be an issue, may need review
- **LOW**: Possible issue, may have false positives

## Impact Ratings

- **HIGH**: Severe security impact if exploited
- **MEDIUM**: Moderate security impact
- **LOW**: Minor security impact

## Likelihood Ratings

- **HIGH**: Very likely to be exploited
- **MEDIUM**: Moderately likely to be exploited
- **LOW**: Less likely to be exploited

## Custom Rules

You can add custom rules by creating YAML files in the rules directory following the Semgrep rule syntax. See CONTRIBUTING.md for details.
