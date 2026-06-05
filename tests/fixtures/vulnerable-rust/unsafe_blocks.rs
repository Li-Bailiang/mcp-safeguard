// Vulnerable: unsafe block without safety comment
fn dereference_raw_pointer(ptr: *const i32) -> i32 {
    unsafe {
        *ptr
    }
}

// Vulnerable: unsafe function without documentation
pub unsafe fn transmute_data<T, U>(value: T) -> U {
    std::mem::transmute_copy(&value)
}

// Vulnerable: unwrap without error handling
fn read_file(path: &str) -> String {
    std::fs::read_to_string(path).unwrap()
}

// Vulnerable: expect in production code
fn parse_number(s: &str) -> i32 {
    s.parse::<i32>().expect("Failed to parse number")
}

// Vulnerable: unwrap_unchecked
fn get_first_unchecked(vec: Vec<i32>) -> i32 {
    unsafe { vec.get(0).unwrap_unchecked().clone() }
}

// Vulnerable: chaining ok().unwrap()
fn convert_and_unwrap(s: &str) -> i32 {
    s.parse::<i32>().ok().unwrap()
}
