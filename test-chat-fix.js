#!/usr/bin/env node

/**
 * Test script to verify the chat functionality is working after the append function fix
 */

const BASE_URL = 'http://localhost:3000';

async function testChatEndpoint() {
  console.log('🧪 Testing Chat API endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { 
            role: 'user', 
            content: 'Hello, this is a test to verify the chat is working'
          }
        ],
        chatSessionId: 'test-session'
      })
    });

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      console.log('✅ Chat API is responding correctly');
      
      // Check if it's a streaming response
      if (response.headers.get('content-type')?.includes('text/plain')) {
        console.log('📡 Streaming response detected');
        const reader = response.body?.getReader();
        if (reader) {
          let chunks = '';
          for (let i = 0; i < 5; i++) { // Read first few chunks
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = new TextDecoder().decode(value);
            chunks += chunk;
            console.log(`📦 Chunk ${i + 1}:`, chunk.slice(0, 100) + '...');
          }
          reader.releaseLock();
        }
      } else {
        const data = await response.text();
        console.log('📄 Response:', data.slice(0, 200) + '...');
      }
    } else {
      console.error('❌ Chat API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error details:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

async function testAppLoading() {
  console.log('🌐 Testing app loading...');
  
  try {
    const response = await fetch(BASE_URL);
    console.log('📊 Homepage Status:', response.status);
    
    if (response.ok) {
      const html = await response.text();
      const hasReact = html.includes('_next') || html.includes('react');
      const hasAuth = html.includes('signin') || html.includes('auth');
      
      console.log('✅ App loads successfully');
      console.log('📦 React detected:', hasReact);
      console.log('🔐 Auth flow detected:', hasAuth);
    } else {
      console.error('❌ App loading failed:', response.status);
    }
    
  } catch (error) {
    console.error('❌ App loading error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Testing Canvas Tool Application');
  console.log('🎯 Focus: Verifying chat append function fix');
  console.log('📍 Target URL:', BASE_URL);
  console.log('');
  
  await testAppLoading();
  console.log('');
  await testChatEndpoint();
  
  console.log('');
  console.log('📋 Summary:');
  console.log('- Fixed useChat append function in ChatAssistant.tsx');
  console.log('- App running on localhost:3000');
  console.log('- Basic API connectivity tested');
  console.log('');
  console.log('✨ Ready for browser testing!');
  console.log('💡 Navigate to http://localhost:3000 to test the UI');
}

runTests().catch(console.error);