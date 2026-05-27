import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Mengimpor file konfigurasi Echo yang kita bahas sebelumnya
import './echo';