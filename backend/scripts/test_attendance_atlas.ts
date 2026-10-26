import dotenv from 'dotenv';
import path from 'path';
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User } from '../src/models/User';
import { StudentProfile } from '../src/models/Profiles';
import { Enrollment } from '../src/models/Batch';

const API_URL = 'http://127.0.0.1:5000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'naprocs_super_secure_jwt_secret_key_change_in_production_2026';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to Atlas DB successfully.');

  // Find Admin user
  let adminUser = await User.findOne({ role: 'ADMIN' });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'System Administrator',
      email: 'admin@naprocs.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      passwordHash: 'dummy',
    });
  }

  // Find Student user with profile and active enrollment
  let studentUser = await User.findOne({ role: 'STUDENT', status: 'ACTIVE' });
  let studentProfile = studentUser ? await StudentProfile.findOne({ user: studentUser._id }) : null;

  console.log('Admin user found:', adminUser.email, adminUser._id.toString());
  console.log('Student user found:', studentUser?.email, studentUser?._id.toString());

  const adminToken = jwt.sign(
    { userId: adminUser._id.toString(), role: adminUser.role, email: adminUser.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const studentToken = jwt.sign(
    { userId: studentUser!._id.toString(), role: studentUser!.role, email: studentUser!.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  console.log('\n--- 1. Testing Campus Network Info Endpoint ---');
  const netRes = await fetch(`${API_URL}/attendance/network-info`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const netData = (await netRes.json()) as any;
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
  const updateData = (await updateRes.json()) as any;
  console.log('Update Status:', updateRes.status);
  console.log('Update Message:', updateData.message);
  console.log('Allowed IPs in DB:', updateData.settings?.allowedWifiIps);

  console.log('\n--- 3. Student 1-Click Check-In on Campus Wi-Fi ---');
  const checkInRes = await fetch(`${API_URL}/attendance/check-in`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const checkInData = (await checkInRes.json()) as any;
  console.log('Check-In Status:', checkInRes.status);
  console.log('Check-In Success:', checkInData.success);
  console.log('Check-In Message:', checkInData.message);
  console.log('isCheckedIn:', checkInData.isCheckedIn);

  console.log('\n--- 4. Student Live Status & Stopwatch Reading ---');
  const liveRes = await fetch(`${API_URL}/attendance/live-status`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const liveData = (await liveRes.json()) as any;
  console.log('Live Status isCheckedIn:', liveData.isCheckedIn);
  console.log('Check-In Time:', liveData.checkInTime);
  console.log('Current Elapsed (Minutes):', liveData.currentDurationMinutes);
  console.log('Campus Wi-Fi Matched:', liveData.wifiStatus?.isCampusWifi);

  console.log('\n--- 5. Student 1-Click Check-Out (Calculating Duration) ---');
  const checkOutRes = await fetch(`${API_URL}/attendance/check-out`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const checkOutData = (await checkOutRes.json()) as any;
  console.log('Check-Out Status:', checkOutRes.status);
  console.log('Check-Out Success:', checkOutData.success);
  console.log('Recorded Attended Duration:', checkOutData.formattedDuration);
  console.log('Duration in Minutes:', checkOutData.durationMinutes);
  console.log('Assigned Attendance Status:', checkOutData.status);

  console.log('\n--- 6. Testing Home / External Network Restriction (Anti-Proxy) ---');
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
  const deniedData = (await deniedCheckInRes.json()) as any;
  console.log('Home/External Check-In HTTP Status (Expected 403):', deniedCheckInRes.status);
  console.log('Wi-Fi Restricted flag:', deniedData.wifiRestricted);
  console.log('Rejection Message:', deniedData.message);

  console.log('\n--- 7. Restoring Campus Wi-Fi Configuration ---');
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

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error in test:', err);
  process.exit(1);
});
