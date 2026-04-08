const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('excelFile');
const selectedFile = document.getElementById('selectedFile');
const submitButton = document.getElementById('submitButton');

function updateSelectedFile() {
  if (!fileInput || !selectedFile) {
    return;
  }

  const [file] = fileInput.files || [];
  selectedFile.textContent = file
    ? `Archivo listo: ${file.name}`
    : 'Ningun archivo seleccionado.';
}

if (fileInput) {
  updateSelectedFile();
  fileInput.addEventListener('change', updateSelectedFile);
}

if (uploadForm && submitButton) {
  uploadForm.addEventListener('submit', () => {
    submitButton.disabled = true;
    submitButton.textContent = 'Procesando consulta...';
    uploadForm.classList.add('is-submitting');
  });
}
