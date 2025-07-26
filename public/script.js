
document.addEventListener('DOMContentLoaded', () => {
  fetch('/api/users')
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector('#data-table tbody');
      tbody.innerHTML = '';
      data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${row.id}</td><td>${row.name}</td><td>${row.email}</td>`;
        tbody.appendChild(tr);
      });
    });

  document.getElementById('import-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const res = await fetch('/import', {
      method: 'POST',
      body: formData
    });
    const msg = await res.text();
    alert(msg);
    location.reload();
  });
});

function showImport() {
  document.getElementById('import-section').classList.remove('hidden');
  document.getElementById('export-section').classList.add('hidden');
  document.getElementById('top-spacer').classList.add('hidden');
}

function showExport() {
  document.getElementById('export-section').classList.remove('hidden');
  document.getElementById('import-section').classList.add('hidden');
  document.getElementById('top-spacer').classList.add('hidden');
}
