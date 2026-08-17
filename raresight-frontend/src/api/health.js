import client from './client.js';

export const getHealthApi = async () => {
  const response = await client.get('/health');
  return response.data;
};
