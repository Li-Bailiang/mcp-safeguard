// Safe: unsafe block with SAFETY comment
fn dereference_raw_pointer_safe(ptr: *const i32) -> i32 {
    // SAFETY: The caller guarantees that `ptr` is valid, properly aligned,
    // and points to an initialized i32 value
    unsafe {
        *ptr
    }
}

// Safe: unsafe function with safety documentation
/// # Safety
///
/// This function is unsafe because it performs an unchecked type transmutation.
/// The caller must ensure that:
/// - The size of T and U are identical
/// - The bit patterns of T are valid for type U
pub unsafe fn transmute_data_safe<T, U>(value: T) -> U {
    std::mem::transmute_copy(&value)
}

// Safe: proper error handling with Result
fn read_file_safe(path: &str) -> std::io::Result<String> {
    std::fs::read_to_string(path)
}

// Safe: using ? operator
fn parse_number_safe(s: &str) -> Result<i32, std::num::ParseIntError> {
    s.parse::<i32>()
}

// Safe: handle with match
fn parse_or_default_safe(s: &str) -> i32 {
    match s.parse::<i32>() {
        Ok(n) => n,
        Err(_) => 0,
    }
}

// Safe: using get() instead of unchecked access
fn get_first_safe(vec: &[i32]) -> Option<i32> {
    vec.get(0).copied()
}

// Safe: proper error propagation
fn convert_safe(s: &str) -> Result<i32, std::num::ParseIntError> {
    s.parse::<i32>()
}

// Safe: unwrap is OK in tests
#[cfg(test)]
mod tests {
    #[test]
    fn test_parsing() {
        let result = "42".parse::<i32>().unwrap();
        assert_eq!(result, 42);
    }
}

// Safe: unwrap in main (acceptable for simple CLIs)
fn main() {
    let config = std::fs::read_to_string("config.toml").unwrap();
    println!("{}", config);
}
