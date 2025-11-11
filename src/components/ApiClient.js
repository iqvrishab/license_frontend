import axios from 'axios';

// Backend API endpoint - Lambda URL for license management
// Full URLs will be: https://f3tigq2rmb74psnp6nafqqg54i0kysrw.lambda-url.ap-south-1.on.aws/backend_api/{endpoint}
const apiBase = process.env.REACT_APP_API_BASE || 'https://f3tigq2rmb74psnp6nafqqg54i0kysrw.lambda-url.ap-south-1.on.aws/backend_api';

// Debug: Log the API base URL (remove in production if desired)
console.log('API Base URL:', apiBase);

const apiClient = axios.create({
  baseURL: apiBase
});

export const checkLicense = (licenseKey) => {
  return apiClient.get(`/check-license/${licenseKey}`);
};

export const generateLicense = (data) => {
  return apiClient.post('/generate-license', data);
};

export const getAllLicenses = () => {
  return apiClient.get('/all-licenses');
};

export const deleteLicense = (licenseKey) => {
  return apiClient.delete(`/delete-license/${licenseKey}`);
};

export const updateLicense = (licenseKey, data) => {
  return apiClient.put(`/update-license/${licenseKey}`, data);
};