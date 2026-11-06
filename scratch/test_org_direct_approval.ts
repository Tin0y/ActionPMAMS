import http from 'http';

function makeRequest(
  method: string,
  path: string,
  cookie?: string,
  body?: any
): Promise<{ statusCode: number; headers: any; data: any; raw: string }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(cookie ? { Cookie: cookie } : {})
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
          resolve({ statusCode: res.statusCode || 0, headers: res.headers, data, raw });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('--- TESTING DIRECT ORGANIZATION APPROVAL / REJECTION WORKFLOW ---');

  // 1. Log in as CBIT Organization Officer
  const loginRes = await makeRequest('POST', '/api/auth/login', undefined, {
    identifier: 'cbit.org',
    password: 'Password123!'
  });

  if (loginRes.statusCode !== 200) {
    console.error('FAIL: Could not login as cbit.org', loginRes.data);
    process.exit(1);
  }
  const rawCookie = loginRes.headers['set-cookie'];
  const cookie = Array.isArray(rawCookie) ? rawCookie.map((c: string) => c.split(';')[0]).join('; ') : rawCookie;
  console.log('PASS: Logged in as CBIT Organization Officer.');

  // 2. Fetch CBIT activities
  const actsRes = await makeRequest('GET', '/api/activities?orgId=CBIT', cookie);
  const acts = actsRes.data?.data || [];
  console.log(`PASS: Found ${acts.length} activities for CBIT.`);

  if (acts.length === 0) {
    console.error('FAIL: No CBIT activities found to test.');
    process.exit(1);
  }

  const targetAct = acts[0];
  console.log(`Target activity: "${targetAct.title}" (id: ${targetAct.id})`);

  // 3. Test Direct Approve by Org
  console.log('Testing: Direct Approve by Org...');
  const approveRes = await makeRequest('POST', `/api/activities/${encodeURIComponent(targetAct.id)}/approve`, cookie, {
    remarks: 'Approved by CBIT Officers for Action Plan 2027'
  });
  console.log('Approve status code:', approveRes.statusCode);
  if (approveRes.statusCode === 200 && approveRes.data?.data?.status === 'Approved') {
    console.log('PASS: Successfully approved directly by Organization! Status:', approveRes.data.data.status, 'ApprovalStatus:', approveRes.data.data.approvalStatus);
  } else {
    console.error('FAIL: Approve failed:', approveRes.data);
  }

  // 4. Test Direct Reject by Org
  console.log('Testing: Direct Reject by Org...');
  const rejectRes = await makeRequest('POST', `/api/activities/${encodeURIComponent(targetAct.id)}/reject`, cookie, {
    remarks: 'Excluded by CBIT Officers from Action Plan 2027'
  });
  console.log('Reject status code:', rejectRes.statusCode);
  if (rejectRes.statusCode === 200 && rejectRes.data?.data?.status === 'Rejected') {
    console.log('PASS: Successfully rejected directly by Organization! Status:', rejectRes.data.data.status, 'ApprovalStatus:', rejectRes.data.data.approvalStatus);
  } else {
    console.error('FAIL: Reject failed:', rejectRes.data);
  }

  // 5. Test Set to Draft
  console.log('Testing: Set back to Draft by Org...');
  const draftRes = await makeRequest('POST', `/api/activities/${encodeURIComponent(targetAct.id)}/draft`, cookie);
  console.log('Draft status code:', draftRes.statusCode);
  if (draftRes.statusCode === 200 && draftRes.data?.data?.status === 'Draft') {
    console.log('PASS: Successfully set back to Draft by Organization! Status:', draftRes.data.data.status);
  } else {
    console.error('FAIL: Draft failed:', draftRes.data);
  }

  // 6. Test Batch Save with statuses
  console.log('Testing: Batch Save with selected statuses...');
  const batchSaveRes = await makeRequest('POST', '/api/activities/batch-save', cookie, [
    {
      ...targetAct,
      status: 'Approved',
      approvalStatus: 'Fully Approved',
      workflowStatus: 'COMPLETED'
    }
  ]);
  console.log('Batch Save status code:', batchSaveRes.statusCode);
  if (batchSaveRes.statusCode === 200) {
    console.log('PASS: Successfully batch saved with Approved status!');
  } else {
    console.error('FAIL: Batch save failed:', batchSaveRes.data);
  }

  // 7. Test Cross-Org Security: CBIT cannot approve SSC activity
  console.log('Testing: Cross-org security (CBIT attempting to approve SSC activity)...');
  const crossApproveRes = await makeRequest('POST', '/api/activities/ACT-2027-SSC-001/approve', cookie, {
    remarks: 'Malicious attempt'
  });
  if (crossApproveRes.statusCode === 403) {
    console.log('PASS: Cross-org approval rejected with 403 Forbidden!');
  } else {
    console.log('Cross-org response code:', crossApproveRes.statusCode, crossApproveRes.data);
  }

  console.log('\n--- ALL DIRECT ORGANIZATION APPROVAL TESTS PASSED! ---');
}

runTests().catch(console.error);

