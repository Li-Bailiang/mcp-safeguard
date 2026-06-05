package main

import (
	"fmt"
	"reflect"
	"unsafe"
)

// VULNERABLE: Unsafe string to bytes conversion
func stringToBytes(s string) []byte {
	return *(*[]byte)(unsafe.Pointer(&s))
}

// VULNERABLE: Unsafe pointer arithmetic
func unsafeArrayAccess(arr []int, index int) int {
	ptr := unsafe.Pointer(&arr[0])
	offset := uintptr(index) * unsafe.Sizeof(arr[0])
	return *(*int)(unsafe.Pointer(uintptr(ptr) + offset))
}

// VULNERABLE: Using deprecated reflect.SliceHeader
func bytesToString(b []byte) string {
	sliceHeader := (*reflect.SliceHeader)(unsafe.Pointer(&b))
	stringHeader := reflect.StringHeader{
		Data: sliceHeader.Data,
		Len:  sliceHeader.Len,
	}
	return *(*string)(unsafe.Pointer(&stringHeader))
}

// VULNERABLE: Unsafe type conversion
func floatBitsToInt(f float64) uint64 {
	return *(*uint64)(unsafe.Pointer(&f))
}

// VULNERABLE: Unsafe pointer to modify readonly data
func modifyString(s string) {
	header := (*reflect.StringHeader)(unsafe.Pointer(&s))
	data := (*[100]byte)(unsafe.Pointer(header.Data))
	data[0] = 'X' // Undefined behavior!
}

func main() {
	s := "Hello"
	b := stringToBytes(s)
	fmt.Println(b)

	arr := []int{1, 2, 3, 4, 5}
	fmt.Println(unsafeArrayAccess(arr, 2))
}
