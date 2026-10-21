<?php
// Cấu hình giao diện PHP: trỏ tới API Node.js
// Đổi bằng biến môi trường API_BASE nếu API chạy ở địa chỉ khác
define('API_BASE', getenv('API_BASE') ?: 'http://localhost:3000/api');
define('APP_NAME', 'Quản lý Task');
