'use client';

import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';

export default function DebugPage() {
  const testBackendConnection = async () => {
    try {
      console.log('🧪 Testing backend connection...');
      const response = await fetch(`${API_BASE_URL}/api/auth/check-user/?email=test@example.com`);
      const data = await response.json();
      console.log('✅ Backend connection test result:', data);
      alert(`Backend connection test: ${response.ok ? 'SUCCESS' : 'FAILED'}\nStatus: ${response.status}\nData: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error('❌ Backend connection test failed:', error);
      alert(`Backend connection test FAILED:\n${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🔧 API Debug Information</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📡 API Configuration</h2>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700">Base URL:</span>
              <span className="ml-2 font-mono text-blue-600">{API_BASE_URL}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Signup Endpoint:</span>
              <span className="ml-2 font-mono text-green-600">{API_BASE_URL}{API_ENDPOINTS.SIGNUP}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Login Endpoint:</span>
              <span className="ml-2 font-mono text-green-600">{API_BASE_URL}{API_ENDPOINTS.LOGIN}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Personal Details Endpoint:</span>
              <span className="ml-2 font-mono text-green-600">{API_BASE_URL}{API_ENDPOINTS.PERSONAL_DETAILS}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">🧪 Test Backend Connection</h2>
          <p className="text-gray-600 mb-4">
            Click the button below to test if the backend is reachable and responding.
          </p>
          <button
            onClick={testBackendConnection}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Test Backend Connection
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📋 Troubleshooting Steps</h2>
          <div className="space-y-3 text-gray-700">
            <div className="flex items-start">
              <span className="text-blue-600 mr-2">1.</span>
              <span>Make sure your Django backend is running on port 9090</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-600 mr-2">2.</span>
              <span>Check that the backend URL in the config matches your backend</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-600 mr-2">3.</span>
              <span>Verify CORS settings allow requests from localhost:3000</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-600 mr-2">4.</span>
              <span>Check the browser console and Django console for error messages</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
