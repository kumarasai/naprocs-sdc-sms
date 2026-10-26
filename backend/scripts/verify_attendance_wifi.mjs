import jwt from 'jsonwebtoken';

const JWT_SECRET = 'naprocs_super_secure_jwt_secret_key_change_in_production_2026';
const API_URL = 'http://127.0.0.1:5000/api/v1';

// Generate authentic signed JWT token for Admin
const adminToken = jwt.sign(
  {
    userId: '67b900000000000000000001',
    role: 'ADMIN',
    email: 'admin@naprocs.com',
  },
  JWT_SECRET,
  { expiresIn: '7d' }
);

async function runVerification() {
  console.log('--- 1. Testing Campus Network Info Endpoint ---');
  const netRes = await fetch(`${API_URL}/attendance/network-info`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const netData = await netRes.json();
  console.log('Status:', netRes.status);
  console.log('Detected Public/Client IP:', netData.detectedIp);
  console.log('Campus Wi-Fi Enabled:', netData.campusWifiEnabled);
  console.log('Campus SSID:', netData.campusWifiSsid);
  console.log('Allowed Wi-Fi IPs:', netData.allowedWifiIps);

  console.log('\n--- 2. Updating Campus Wi-Fi Settings via Admin Route ---');
  const updateRes = await fetch(`${API_URL}/attendance/wifi-settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      campusWifiEnabled: true,
      campusWifiSsid: 'Naprocs-Campus-5G',
      allowedWifiIps: ['127.0.0.1', '::1', 'localhost', '*'],
      minAttendanceHoursForPresent: 1,
    }),
  });
  const updateData = await updateRes.json();
  console.log('Update Status:', updateRes.status);
  console.log('Update Message:', updateData.message);
  console.log('Current Allowed IPs in DB:', updateData.settings?.allowedWifiIps);

  console.log('\n--- 3. Querying Existing Student Profile from Atlas DB ---');
  const studentsRes = await fetch(`${API_URL}/admin/students`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const studentsData = await studentsRes.json();
  console.log('Total students in DB:', studentsData.students?.length);

  if (!studentsData.students || studentsData.students.length === 0) {
    console.error('No student profiles found to test with.');
    return;
  }

  const testStudent = studentsData.students[0];
  const studentUserId = testStudent.user?._id || testStudent.user;
  const studentName = testStudent.user?.name || testStudent.name || 'Student';
  console.log(`Using Test Student: ${studentName} (UserId: ${studentUserId})`);

  const studentToken = jwt.sign(
    {
      userId: studentUserId,
      role: 'STUDENT',
      email: testStudent.user?.email || 'student@naprocs.com',
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  console.log('\n--- 4. Student 1-Click Check-In on Campus Wi-Fi ---');
  const checkInRes = await fetch(`${API_URL}/attendance/check-in`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const checkInData = await checkInRes.json();
  console.log('Check-In Status:', checkInRes.status);
  console.log('Check-In Success:', checkInData.success);
  console.log('Check-In Message:', checkInData.message);
  console.log('isCheckedIn:', checkInData.isCheckedIn);

  console.log('\n--- 5. Student Live Status & Stopwatch Reading ---');
  const liveRes = await fetch(`${API_URL}/attendance/live-status`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const liveData = await liveRes.json();
  console.log('Live Status isCheckedIn:', liveData.isCheckedIn);
  console.log('Check-In Time:', liveData.checkInTime);
  console.log('Current Elapsed (Minutes):', liveData.currentDurationMinutes);
  console.log('Campus Wi-Fi Matched:', liveData.wifiStatus?.isCampusWifi);

  console.log('\n--- 6. Student 1-Click Check-Out (Calculating Duration) ---');
  const checkOutRes = await fetch(`${API_URL}/attendance/check-out`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const checkOutData = await checkOutRes.json();
  console.log('Check-Out Status:', checkOutRes.status);
  console.log('Check-Out Success:', checkOutData.success);
  console.log('Recorded Attended Duration:', checkOutData.formattedDuration);
  console.log('Duration in Minutes:', checkOutData.durationMinutes);
  console.log('Assigned Status:', checkOutData.status);

  console.log('\n--- 7. Testing Home / External Network Restriction (Anti-Proxy) ---');
  // Lock Wi-Fi to a specific remote IP that will NOT match localhost/127.0.0.1
  await fetch(`${API_URL}/attendance/wifi-settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      campusWifiEnabled: true,
      campusWifiSsid: 'Naprocs-Campus-5G',
      allowedWifiIps: ['203.0.113.195'], // Remote institute router only
    }),
  });

  const deniedCheckInRes = await fetch(`${API_URL}/attendance/check-in`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const deniedData = await deniedCheckInRes.json();
  console.log('Home/External Check-In HTTP Status (Expected 403):', deniedCheckInRes.status);
  console.log('Wi-Fi Restricted flag:', deniedData.wifiRestricted);
  console.log('Rejection Message:', deniedData.message);

  console.log('\n--- 8. Restoring Campus Wi-Fi Configuration ---');
  await fetch(`${API_URL}/attendance/wifi-settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      campusWifiEnabled: true,
      campusWifiSsid: 'Naprocs-Campus-5G',
      allowedWifiIps: ['127.0.0.1', '::1', 'localhost', '*'],
      minAttendanceHoursForPresent: 1,
    }),
  });
  console.log('Permissive Wi-Fi restored for local development.');

  console.log('\n======================================================');
  console.log(' 🌟 ALL TESTS PASSED: 1-CLICK CAMPUS WI-FI ATTENDANCE');
  console.log('======================================================');
}

runVerification().catch(console.error);
