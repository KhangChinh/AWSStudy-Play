import { ingestServerData } from './syncService';

export const ingestErrorResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  await ingestServerData(data);
  return data;
};
