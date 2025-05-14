// Buka atau buat database
let db;
const request = indexedDB.open('CrudDB', 1);

request.onupgradeneeded = (event) => {
    db = event.target.result;
    // Buat object store (tabel) jika belum ada
    if (!db.objectStoreNames.contains('users')) {
        const store = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
        // Buat index untuk pencarian
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('email', 'email', { unique: true });
    }
};

request.onsuccess = (event) => {
    db = event.target.result;
    console.log('Database berhasil dibuka');
    tampilkanData();
};

request.onerror = (event) => {
    console.error('Error membuka database:', event.target.error);
};

// CREATE - Tambah data
document.getElementById('dataForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const age = document.getElementById('age').value;
    
    const transaction = db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');
    
    const user = { name, email, age: parseInt(age) };
    const request = store.add(user);
    
    request.onsuccess = () => {
        document.getElementById('dataForm').reset();
        tampilkanData();
    };
    
    request.onerror = (event) => {
        console.error('Error menambahkan data:', event.target.error);
    };
});

// READ - Tampilkan data
function tampilkanData() {
    const transaction = db.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');
    const request = store.getAll();
    
    request.onsuccess = (event) => {
        const dataList = document.getElementById('dataList');
        dataList.innerHTML = '<h2>Daftar Pengguna</h2>';
        
        if (event.target.result.length === 0) {
            dataList.innerHTML += '<p>Tidak ada data</p>';
            return;
        }
        
        const table = document.createElement('table');
        table.innerHTML = `
            <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Usia</th>
                <th>Aksi</th>
            </tr>
        `;
        
        event.target.result.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.age}</td>
                <td>
                    <button onclick="editData(${user.id})">Edit</button>
                    <button onclick="hapusData(${user.id})">Hapus</button>
                </td>
            `;
            table.appendChild(row);
        });
        
        dataList.appendChild(table);
    };
}

// UPDATE - Edit data
function editData(id) {
    const transaction = db.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');
    const request = store.get(id);
    
    request.onsuccess = (event) => {
        const user = event.target.result;
        document.getElementById('name').value = user.name;
        document.getElementById('email').value = user.email;
        document.getElementById('age').value = user.age;
        
        // Ubah form submit untuk update
        const form = document.getElementById('dataForm');
        form.onsubmit = (e) => {
            e.preventDefault();
            
            const updatedUser = {
                id: id,
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                age: parseInt(document.getElementById('age').value)
            };
            
            const updateTransaction = db.transaction(['users'], 'readwrite');
            const updateStore = updateTransaction.objectStore('users');
            updateStore.put(updatedUser);
            
            updateTransaction.oncomplete = () => {
                form.reset();
                form.onsubmit = submitHandler; // Kembalikan ke fungsi tambah data
                tampilkanData();
            };
        };
    };
}

// DELETE - Hapus data
function hapusData(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
        const transaction = db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        store.delete(id);
        
        transaction.oncomplete = () => {
            tampilkanData();
        };
    }
}