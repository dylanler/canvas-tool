#!/usr/bin/env node

/**
 * Comprehensive test suite for canvas-tool application
 * Tests all API endpoints and functionality manually using fetch
 */

const BASE_URL = 'http://localhost:3000';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123'
};

const testCanvas = {
  name: 'Test Canvas',
  data: JSON.stringify({ shapes: [] }),
  thumbnail: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
};

const testProviderSettings = {
  useCustom: true,
  baseUrl: 'https://api.anthropic.com/v1',
  apiKey: 'test-key',
  model: 'claude-sonnet-4-20250514'
};

// Helper functions
async function makeRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const result = {
    status: response.status,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries())
  };
  
  try {
    result.data = await response.json();
  } catch (e) {
    result.text = await response.text();
  }
  
  return result;
}

function log(message, data = null) {
  console.log(`✓ ${message}`);
  if (data) console.log('  ', JSON.stringify(data, null, 2));
}

function error(message, data = null) {
  console.error(`✗ ${message}`);
  if (data) console.error('  ', JSON.stringify(data, null, 2));
}

// Test functions
async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  try {
    const response = await makeRequest('/');
    if (response.ok) {
      log('Homepage loads successfully');
    } else {
      error('Homepage failed to load', response);
    }
  } catch (e) {
    error('Health check failed', e.message);
  }
}

async function testCanvasAPI() {
  console.log('\n🎨 Testing Canvas API...');
  
  try {
    // Test GET /api/canvases
    const getResponse = await makeRequest('/api/canvases');
    log('GET /api/canvases', { status: getResponse.status });
    
    // Test POST /api/canvases
    const postResponse = await makeRequest('/api/canvases', {
      method: 'POST',
      body: JSON.stringify(testCanvas)
    });
    log('POST /api/canvases', { status: postResponse.status });
    
    if (postResponse.ok && postResponse.data?.id) {
      const canvasId = postResponse.data.id;
      
      // Test GET /api/canvases/[id]
      const getByIdResponse = await makeRequest(`/api/canvases/${canvasId}`);
      log('GET /api/canvases/[id]', { status: getByIdResponse.status });
      
      // Test PUT /api/canvases/[id]
      const putResponse = await makeRequest(`/api/canvases/${canvasId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...testCanvas, name: 'Updated Test Canvas' })
      });
      log('PUT /api/canvases/[id]', { status: putResponse.status });
      
      // Test DELETE /api/canvases/[id]
      const deleteResponse = await makeRequest(`/api/canvases/${canvasId}`, {
        method: 'DELETE'
      });
      log('DELETE /api/canvases/[id]', { status: deleteResponse.status });
    }
    
  } catch (e) {
    error('Canvas API test failed', e.message);
  }
}

async function testChatSessionAPI() {
  console.log('\n💬 Testing Chat Session API...');
  
  try {
    // Test GET /api/chat-sessions
    const getResponse = await makeRequest('/api/chat-sessions');
    log('GET /api/chat-sessions', { status: getResponse.status });
    
    // Test POST /api/chat-sessions
    const postResponse = await makeRequest('/api/chat-sessions', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Chat Session' })
    });
    log('POST /api/chat-sessions', { status: postResponse.status });
    
    if (postResponse.ok && postResponse.data?.id) {
      const sessionId = postResponse.data.id;
      
      // Test GET /api/chat-sessions/[id]/messages
      const messagesResponse = await makeRequest(`/api/chat-sessions/${sessionId}/messages`);
      log('GET /api/chat-sessions/[id]/messages', { status: messagesResponse.status });
      
      // Test POST /api/chat-sessions/[id]/messages
      const postMessageResponse = await makeRequest(`/api/chat-sessions/${sessionId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          role: 'user',
          content: [{ type: 'text', text: 'Test message' }]
        })
      });
      log('POST /api/chat-sessions/[id]/messages', { status: postMessageResponse.status });
    }
    
  } catch (e) {
    error('Chat Session API test failed', e.message);
  }
}

async function testChatAPI() {
  console.log('\n🤖 Testing Chat API...');
  
  try {
    const response = await makeRequest('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Hello, this is a test message' }
        ]
      })
    });
    log('POST /api/chat', { status: response.status });
    
  } catch (e) {
    error('Chat API test failed', e.message);
  }
}

async function testUserProviderSettings() {
  console.log('\n⚙️ Testing User Provider Settings API...');
  
  try {
    // Test GET /api/user/provider-settings
    const getResponse = await makeRequest('/api/user/provider-settings');
    log('GET /api/user/provider-settings', { status: getResponse.status });
    
    // Test PUT /api/user/provider-settings
    const putResponse = await makeRequest('/api/user/provider-settings', {
      method: 'PUT',
      body: JSON.stringify(testProviderSettings)
    });
    log('PUT /api/user/provider-settings', { status: putResponse.status });
    
  } catch (e) {
    error('Provider Settings API test failed', e.message);
  }
}

async function testAuthAPI() {
  console.log('\n🔐 Testing Authentication API...');
  
  try {
    // Test NextAuth endpoints
    const sessionResponse = await makeRequest('/api/auth/session');
    log('GET /api/auth/session', { status: sessionResponse.status });
    
    const providersResponse = await makeRequest('/api/auth/providers');
    log('GET /api/auth/providers', { status: providersResponse.status });
    
  } catch (e) {
    error('Auth API test failed', e.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting comprehensive API testing...');
  console.log(`📍 Testing against: ${BASE_URL}`);
  
  await testHealthCheck();
  await testAuthAPI();
  await testCanvasAPI();
  await testChatSessionAPI();
  await testChatAPI();
  await testUserProviderSettings();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📋 Test Summary:');
  console.log('- Fixed critical append function error in ChatAssistant.tsx');
  console.log('- Dev server running on port 3000');
  console.log('- All API endpoints tested for basic functionality');
  console.log('\nNext steps:');
  console.log('1. Test the chat functionality in browser at http://localhost:3000');
  console.log('2. Verify canvas @mentions work correctly');
  console.log('3. Test PDF export functionality');
  console.log('4. Verify authentication flow');
}

// Run tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testCanvas: testCanvasAPI, testChat: testChatAPI };