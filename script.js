// PWA Installation
let deferredPrompt;
const installButton = document.getElementById("installButton");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installButton.style.display = "block";
});

installButton.addEventListener("click", async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      installButton.style.display = "none";
    }
    deferredPrompt = null;
  }
});

// Offline Detection
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

function updateOnlineStatus() {
  const offlineNotification = document.getElementById("offlineNotification");
  if (!navigator.onLine) {
    offlineNotification.style.display = "block";
  } else {
    offlineNotification.style.display = "none";
  }
}

// Initialize
updateOnlineStatus();

// Database and CRUD Operations
let db;
const DB_NAME = "DataManagementDB";
const DB_VERSION = 1;
const STORE_NAME = "users";

// Open or create database
const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onupgradeneeded = (event) => {
  db = event.target.result;
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    const store = db.createObjectStore(STORE_NAME, {
      keyPath: "id",
      autoIncrement: true,
    });
    store.createIndex("name", "name", { unique: false });
    store.createIndex("email", "email", { unique: true });
  }
};

request.onsuccess = (event) => {
  db = event.target.result;
  loadData();

  // Listen for changes in the database
  db.onversionchange = function () {
    db.close();
    // alert("Database is outdated, please reload the page.");
  };
};

request.onerror = (event) => {
  console.error("Database error:");
//   showAlert("error", "Database error: ")
};

// Show alert/notification function
function showAlert(type, message) {
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;

  document.body.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.classList.add("fade-out");
    setTimeout(() => alertDiv.remove(), 500);
  }, 3000);
}

// Form submission
document.getElementById("dataForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const user = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    age: parseInt(document.getElementById("age").value) || null,
    timestamp: new Date().getTime(),
  };

  const transaction = db.transaction([STORE_NAME], "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  const request = store.add(user);

  request.onsuccess = (event) => {
    const id = event.target.result;
    user.id = id; // Simpan ID yang diberikan oleh IndexedDB

    document.getElementById("dataForm").reset();
    showAlert("success", "Data berhasil disimpan");

    // Tambah baris langsung ke tabel jika sudah ada
    const tableBody = document.querySelector(".data-table tbody");
    if (tableBody) {
      const newRow = document.createElement("tr");
      newRow.setAttribute("data-id", id);
      newRow.innerHTML = `
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.age || "-"}</td>
      <td class="action-buttons">
        <button class="btn-edit" onclick="editUser(${id})">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="btn-delete" onclick="deleteUser(${id})">
          <i class="fas fa-trash"></i> Hapus
        </button>
      </td>
    `;
      tableBody.appendChild(newRow);
    } else {
      loadData(); // Fallback jika table belum tersedia
    }

    // Show notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Data berhasil disimpan", {
        body: `Data ${user.name} telah ditambahkan`,
        icon: "/icon-192x192.png",
      });
    }
  };

  request.onerror = (event) => {
    // showAlert("error", "Gagal menyimpan data email gak boleh sama ");
  };
});

// Load and display data
function loadData(searchTerm = "") {
  const transaction = db.transaction([STORE_NAME], "readonly");
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();

  request.onsuccess = (event) => {
    const dataList = document.getElementById("dataList");
    const users = event.target.result;

    if (users.length === 0) {
      dataList.innerHTML = `
            <div class="empty-state">
            <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <h3>Tidak ada data tersimpan</h3>
            <p>Mulailah dengan menambahkan data baru menggunakan form di atas</p>
            </div>
        `;
      return;
    }

    // Filter data if search term exists
    let filteredUsers = users;
    if (searchTerm) {
      filteredUsers = users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filteredUsers.length === 0) {
      dataList.innerHTML = `
            <div class="empty-state">
            <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <h3>Data tidak ditemukan</h3>
            <p>Tidak ada data yang cocok dengan pencarian Anda</p>
            </div>
        `;
      return;
    }

    // Create table
    let tableHTML = `
        <table class="data-table">
            <thead>
            <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Usia</th>
                <th>Aksi</th>
            </tr>
            </thead>
            <tbody>
        `;

    filteredUsers.forEach((user) => {
      tableHTML += `
            <tr data-id="${user.id}">
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.age || "-"}</td>
            <td class="action-buttons">
                <button class="btn-edit" onclick="editUser(${user.id})">
                <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-delete" onclick="deleteUser(${user.id})">
                <i class="fas fa-trash"></i> Hapus
                </button>
            </td>
            </tr>
        `;
    });

    tableHTML += `</tbody></table>`;
    dataList.innerHTML = tableHTML;
  };

  request.onerror = (event) => {
  };
}

// Edit user
function editUser(id) {
  const transaction = db.transaction([STORE_NAME], "readonly");
  const store = transaction.objectStore(STORE_NAME);
  const request = store.get(id);

  request.onsuccess = (event) => {
    const user = event.target.result;
    document.getElementById("name").value = user.name;
    document.getElementById("email").value = user.email;
    document.getElementById("age").value = user.age || "";

    // Change form to edit mode
    const form = document.getElementById("dataForm");
    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.textContent = "Update Data";

    // Add cancel button if not exists
    if (!document.getElementById("cancelEdit")) {
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.id = "cancelEdit";
      cancelBtn.className = "btn-cancel";
      cancelBtn.textContent = "Batal";
      cancelBtn.onclick = () => {
        form.reset();
        submitBtn.textContent = "Simpan Data";
        cancelBtn.remove();
      };
      form.appendChild(cancelBtn);
    }

    form.onsubmit = (e) => {
      e.preventDefault();

      const updatedUser = {
        id: id,
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        age: parseInt(document.getElementById("age").value) || null,
        timestamp: new Date().getTime(),
      };

      const updateTransaction = db.transaction([STORE_NAME], "readwrite");
      const updateStore = updateTransaction.objectStore(STORE_NAME);
      updateStore.put(updatedUser);

      updateTransaction.oncomplete = () => {
        showAlert("success", "Data berhasil diperbarui");
        form.reset();
        submitBtn.textContent = "Simpan Data";
        document.getElementById("cancelEdit")?.remove();
        form.onsubmit = submitHandler;

        // Update the specific row in real-time
        updateTableRow(id, updatedUser);
      };

    
    };
  };
}

// Update specific table row without reloading
function updateTableRow(id, user) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (row) {
    row.cells[0].textContent = user.name;
    row.cells[1].textContent = user.email;
    row.cells[2].textContent = user.age || "-";
  } else {
    // If row not found (maybe due to search filter), reload the data
    loadData(document.getElementById("searchInput").value);
  }
}

// Original form submit handler
function submitHandler(e) {
  e.preventDefault();

  const user = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    age: parseInt(document.getElementById("age").value) || null,
    timestamp: new Date().getTime(),
  };

  const transaction = db.transaction([STORE_NAME], "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  const request = store.add(user);

  request.onsuccess = () => {
    document.getElementById("dataForm").reset();
    showAlert("success", "Data berhasil disimpan");

    // Show notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Data berhasil disimpan", {
        body: `Data ${user.name} telah ditambahkan`,
        // icon: "/icon-192x192.png",
      });
    }
  };

  request.onerror = (event) => {
    alert("Email tidak Boleh Sama")
  };
}

// Delete user
function deleteUser(id) {
  if (confirm("Apakah Anda yakin ingin menghapus data ini?")) {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);

    transaction.oncomplete = () => {
      showAlert("success", "Data berhasil dihapus");
      // Remove the row directly
      const row = document.querySelector(`tr[data-id="${id}"]`);
      if (row) {
        row.remove();

        // Check if table is empty now
        const tbody = document.querySelector(".data-table tbody");
        if (tbody && tbody.rows.length === 0) {
          loadData(); // Reload to show empty state
        }
      }
    };

    transaction.onerror = (event) => {
    };
  }
}

// Search functionality
document.getElementById("searchInput").addEventListener("input", (e) => {
  loadData(e.target.value);
});

document.getElementById("clearSearch").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  loadData();
});

// Service Worker Registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("ServiceWorker registration successful");
      })
      .catch((err) => {
        console.log("ServiceWorker registration failed: ", err);
      });
  });
}

// Request notification permission
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}
