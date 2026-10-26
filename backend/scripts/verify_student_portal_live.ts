import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function testStudentPortal() {
  // Login as test@naprocs.in
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@naprocs.in', password: 'Password123!' }),
  });
  const loginData: any = await loginRes.json();
  console.log('Login status:', loginRes.status, 'User Role:', loginData.user?.role);
  if (!loginData.token) {
    console.error('Login failed:', loginData);
    return;
  }

  const token = loginData.token;

  // 1. Get Live Attendance Status
  const liveRes = await fetch('http://localhost:5000/api/v1/attendance/live-status', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const liveStatus: any = await liveRes.json();
  console.log('\n--- LIVE ATTENDANCE STATUS ---');
  console.log({
    isCheckedIn: liveStatus.isCheckedIn,
    hasCompletedToday: liveStatus.hasCompletedToday,
    status: liveStatus.status,
    wifi: liveStatus.wifiStatus?.isCampusWifi,
    clientIp: liveStatus.wifiStatus?.clientIp,
  });

  // 2. Get Student Dashboard
  const dashRes = await fetch('http://localhost:5000/api/v1/students/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dashData: any = await dashRes.json();
  console.log('\n--- STUDENT DASHBOARD DATA ---');
  console.log('Student:', dashData.data?.student);
  console.log('Batch:', dashData.data?.batch);
  console.log('KPIs:', dashData.data?.kpis);
  console.log('Weekly Records count:', dashData.data?.weeklyRecords?.length);
  console.log('Assignments count:', dashData.data?.assignments?.length);
  console.log('Quizzes count:', dashData.data?.quizzes?.length);
  console.log('Materials count:', dashData.data?.materials?.length);
  console.log('Notices count:', dashData.data?.notices?.length);
  console.log('Featured Class:', dashData.data?.featuredClass);

  // 3. Perform 1-Click Check-In
  console.log('\n--- TESTING 1-CLICK CAMPUS CHECK IN ---');
  const checkInRes = await fetch('http://localhost:5000/api/v1/attendance/check-in', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const checkInData: any = await checkInRes.json();
  console.log('Check-In Response:', checkInRes.status, checkInData.message || checkInData);

  // 4. Verify Live Status is now Active (Stopwatch ticking)
  const activeStatusRes = await fetch('http://localhost:5000/api/v1/attendance/live-status', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const activeStatus: any = await activeStatusRes.json();
  console.log('\n--- VERIFIED ACTIVE SESSION (PERSISTS ON REFRESH) ---');
  console.log({
    isCheckedIn: activeStatus.isCheckedIn,
    checkInTime: activeStatus.checkInTime,
    currentDurationMinutes: activeStatus.currentDurationMinutes,
  });
}

testStudentPortal().catch(console.error);
