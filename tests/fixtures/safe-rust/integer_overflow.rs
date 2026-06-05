// Safe: checked arithmetic operations
fn calculate_total_safe(price: u32, quantity: u32) -> Option<u32> {
    price.checked_mul(quantity)
}

// Safe: saturating subtraction
fn calculate_remaining_safe(total: i32, used: i32) -> i32 {
    total.saturating_sub(used)
}

// Safe: TryFrom for integer conversion
use std::convert::TryFrom;

fn convert_size_safe(size: u64) -> Result<u32, std::num::TryFromIntError> {
    u32::try_from(size)
}

// Safe: checked multiplication for buffer allocation
fn allocate_buffer_safe(width: usize, height: usize, depth: usize) -> Option<Vec<u8>> {
    let size = width.checked_mul(height)?.checked_mul(depth)?;
    Some(vec![0; size])
}

// Safe: validate before casting
fn get_array_index_safe(offset: i32) -> Option<usize> {
    if offset >= 0 {
        Some(offset as usize)
    } else {
        None
    }
}

// Safe: checked division
fn calculate_average_safe(sum: i64, count: i64) -> Option<i64> {
    if count == 0 {
        None
    } else {
        sum.checked_div(count)
    }
}

// Safe: bounds checking
fn access_buffer_safe(buffer: &[u8], base: usize, offset: usize) -> Option<u8> {
    let index = base.checked_add(offset)?;
    buffer.get(index).copied()
}
