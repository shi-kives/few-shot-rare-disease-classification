import client from './client.js';

export const diagnoseApi = async (file, modality) => {
  const formData = new FormData();
  formData.append('file', file);
  if (modality && modality !== 'Auto-detect') {
    formData.append('modality', modality);
  }

  const response = await client.post('/diagnose', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
