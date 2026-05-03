const FILE_FIELDS = new Set(["file", "fileUrl", "fileName"]);

export function reportPayloadFromForm(form = {}) {
  const payload = {};

  Object.entries(form).forEach(([key, value]) => {
    if (FILE_FIELDS.has(key)) return;
    if (value === "" || value === null || value === undefined) return;
    payload[key] = value;
  });

  if (!form.file) return payload;

  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    formData.append(key, Array.isArray(value) ? JSON.stringify(value) : value);
  });
  formData.append("file", form.file);

  return formData;
}
