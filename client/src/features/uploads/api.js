import { api } from '../../lib/api';

export function uploadImage(imageFormData) {
  return api.post('/uploads/image', imageFormData);
}
