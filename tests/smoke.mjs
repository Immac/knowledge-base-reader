import http from 'node:http';
import { getSourceInfo, listArticles, getArticle } from '../src/data-source.mjs';

// Test helpers
function request(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}${path}`, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests(port) {
  console.log('Running smoke tests...\n');

  let passed = 0;
  let failed = 0;

  // Test 1: /api/status
  try {
    const res = await request(port, '/api/status');
    if (res.status === 200 && res.body.ok) {
      console.log('✓ /api/status works');
      passed++;
    } else {
      console.log('✗ /api/status failed', res.body);
      failed++;
    }
  } catch (e) {
    console.log('✗ /api/status error', e.message);
    failed++;
  }

  // Test 2: /api/articles
  try {
    const res = await request(port, '/api/articles');
    if (res.status === 200 && res.body.ok && Array.isArray(res.body.articles)) {
      console.log(`✓ /api/articles works (${res.body.articles.length} articles)`);
      passed++;
    } else {
      console.log('✗ /api/articles failed', res.body);
      failed++;
    }
  } catch (e) {
    console.log('✗ /api/articles error', e.message);
    failed++;
  }

  // Test 3: Individual article routes
  const articles = listArticles();
  for (const article of articles) {
    try {
      const res = await request(port, `/api/articles/${article.slug}`);
      if (res.status === 200 && res.body.ok && res.body.article) {
        // OK
      } else {
        console.log(`✗ /api/articles/${article.slug} failed`);
        failed++;
      }
    } catch (e) {
      console.log(`✗ /api/articles/${article.slug} error`, e.message);
      failed++;
    }
  }

  if (articles.length > 0) {
    console.log(`✓ All ${articles.length} article routes work`);
    passed++;
  }

  // Test 4: Missing article returns 404
  try {
    const res = await request(port, '/api/articles/nonexistent-xyz');
    if (res.status === 404 && !res.body.ok) {
      console.log('✓ Missing article returns 404');
      passed++;
    } else {
      console.log('✗ Missing article did not return 404');
      failed++;
    }
  } catch (e) {
    console.log('✗ Missing article test error', e.message);
    failed++;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

// Get port from command line or default
const port = process.argv[2] || 4173;
runTests(port).catch(e => {
  console.error('Test runner error:', e.message);
  process.exit(1);
});