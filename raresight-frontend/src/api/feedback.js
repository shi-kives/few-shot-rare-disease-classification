import client from './client.js';

export const submitFeedbackApi = async ({
  query_embedding,
  predicted_class,
  correct_class,
  is_correct,
  notes,
}) => {
  const payload = {
    query_embedding,
    predicted_class,
    correct_class,
    is_correct,
    notes: notes || '',
  };

  const response = await client.post('/feedback', payload);
  return response.data;
};
