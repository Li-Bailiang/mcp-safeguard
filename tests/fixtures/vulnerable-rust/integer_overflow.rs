// Vulnerable: unchecked addition
fn calculate_total_vulnerable(price: u32, quantity: u32) -> u32 {
    price * quantity
}

// Vulnerable: unchecked subtraction
fn calculate_remaining_vulnerable(total: i32, used: i32) -> i32 {
    total - used
}

// Vulnerable: integer cast that can truncate
fn convert_size_vulnerable(size: u64) -> u32 {
    size as u32
}

// Vulnerable: unchecked multiplication
fn allocate_buffer_vulnerable(width: usize, height: usize, depth: usize) -> Vec<u8> {
    let size = width * height * depth;
    vec![0; size]
}

// Vulnerable: as cast from signed to unsigned
fn get_array_index_vulnerable(offset: i32) -> usize {
    offset as usize
}

// Vulnerable: division without overflow check
fn calculate_average_vulnerable(sum: i64, count: i64) -> i64 {
    sum / count
}

// Vulnerable: addition in array indexing
fn access_buffer_vulnerable(buffer: &[u8], base: usize, offset: usize) -> u8 {
    buffer[base + offset]
}
