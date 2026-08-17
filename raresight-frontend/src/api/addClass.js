import client from './client.js';

export const addClassApi = async ({ className, description, modality, images }) => {
  const formData = new FormData();
  formData.append('class_name', className);
  if (description) {
    formData.append('description', description);
  }
  if (modality) {
    formData.append('modality', modality);
  }

  // Append each image individually
  images.forEach((image) => {
    formData.append('images', image);
  });

  const response = await client.post('/add_class', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
