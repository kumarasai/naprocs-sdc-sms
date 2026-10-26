import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { User } from '../models/User';
import { StudentProfile, TrainerProfile } from '../models/Profiles';
import { Course, CourseModule, Lesson } from '../models/Course';
import { Batch, Enrollment } from '../models/Batch';
import { ClassSession } from '../models/ClassSession';
import { AttendanceSession, AttendanceRecord, AttendanceAuditLog } from '../models/Attendance';
import { Assignment, AssignmentSubmission, Quiz, QuizQuestion, StudyMaterial } from '../models/Learning';
import { Announcement, InstituteSettings } from '../models/Communication';
import { AttendanceTokenService } from '../services/attendanceTokenService';

export async function seedDatabase() {
  console.log('[Seed] Connecting to database...');
  await connectDB();

  console.log('[Seed] Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    StudentProfile.deleteMany({}),
    TrainerProfile.deleteMany({}),
    Course.deleteMany({}),
    CourseModule.deleteMany({}),
    Lesson.deleteMany({}),
    Batch.deleteMany({}),
    Enrollment.deleteMany({}),
    ClassSession.deleteMany({}),
    AttendanceSession.deleteMany({}),
    AttendanceRecord.deleteMany({}),
    AttendanceAuditLog.deleteMany({}),
    Assignment.deleteMany({}),
    AssignmentSubmission.deleteMany({}),
    Quiz.deleteMany({}),
    QuizQuestion.deleteMany({}),
    StudyMaterial.deleteMany({}),
    Announcement.deleteMany({}),
    InstituteSettings.deleteMany({}),
  ]);

  console.log('[Seed] Creating Users...');
  // 1. Admin
  const adminUser = new User({
    name: 'Institute Director',
    email: 'admin@naprocs.com',
    passwordHash: 'Admin@12345',
    phone: '+91 98765 00001',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
  });
  await adminUser.save();

  // 2. Trainer (Dr. V. Sundaram)
  const trainerUser = new User({
    name: 'Dr. V. Sundaram',
    email: 'trainer@naprocs.com',
    passwordHash: 'Trainer@12345',
    phone: '+91 98765 00002',
    role: 'TRAINER',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCyZ44DQoslasDUsiL15318INob5wB4BWZL1C1rT4Kh5EmtosWnOqH0_DKjcGe-iIJ4VCwGWmOHDU8GwxHX3xvhAHgJYd27o8Yu84D069D5wUEkoj-tExBfH21EZrw2wnwsvscCbZGKXgsPvnZml0yz0wGW5C-xuOxKunR-Fsp2pLB3_3cL5WPT4AZ78k5Kp3SLUVcq6oPtRFQjApiFVK9gu6CfgU6gujjI8RwJ58FeAdHaPCohhNyVDg',
  });
  await trainerUser.save();

  const trainerProfile = await TrainerProfile.create({
    user: trainerUser._id,
    trainerId: 'NPC-TR-001',
    designation: 'Chief Technical Trainer',
    bio: 'Experienced Computer Science Educator & Full-stack Architecture Specialist at Naprocs.',
    specialization: ['Node.js', 'Distributed Systems', 'MongoDB', 'Microservices', 'Clean Architecture'],
    experienceYears: 14,
  });

  // 3. Student (Rahul Kumar)
  const studentUser = new User({
    name: 'Rahul Kumar',
    email: 'student@naprocs.com',
    passwordHash: 'Student@12345',
    phone: '+91 98765 00003',
    role: 'STUDENT',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVK-Qe_5QhAX1lNiSBVx8ddbeGWm-1gpfE-1zWCSnsqIqA8uMBtLafP_DZfn2Y-ITX5DGZjegzsOv86M0cpM5PlRn8gq2PxX8vPO3lKlvo_gQZrUd-ua68U3Sy1RWupU1f_vppX7BA9HpkD4V9-IiaCooN0v8j2UpngLNvlW7sgEPAPPNSG4po4GjRpI2snEmpVjVb4nJ2k3dSOAm0cdG7a3Uoofgv9M5CnvRBusPpLJzIvOY-S4OJmA',
  });
  await studentUser.save();

  const studentProfile = await StudentProfile.create({
    user: studentUser._id,
    studentId: 'NPC-2025-N01-084',
    college: 'JNTU College of Engineering, Hyderabad',
    qualification: 'B.Tech in Computer Science',
    graduationYear: 2025,
    githubUrl: 'https://github.com/rahulkumar-dev',
    linkedInUrl: 'https://linkedin.com/in/rahulkumar-dev',
    rfidTag: 'RFID-LAB2-84',
    attendanceHealthPercentage: 94.2,
    storageUsedBytes: 4.2 * 1024 * 1024 * 1024,
  });

  // 4. Peer Students
  const peersData = [
    { name: 'Priya Sharma', email: 'priya@naprocs.com', studentId: 'NPC-2025-N01-085' },
    { name: 'Amit Patel', email: 'amit@naprocs.com', studentId: 'NPC-2025-N01-086' },
    { name: 'Sneha Reddy', email: 'sneha@naprocs.com', studentId: 'NPC-2025-N01-087' },
    { name: 'Vikram Singh', email: 'vikram@naprocs.com', studentId: 'NPC-2025-N01-088' },
  ];

  const peerProfiles: any[] = [];
  for (const peer of peersData) {
    const pUser = new User({
      name: peer.name,
      email: peer.email,
      passwordHash: 'Student@12345',
      role: 'STUDENT',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${peer.name}`,
    });
    await pUser.save();
    const pProf = await StudentProfile.create({
      user: pUser._id,
      studentId: peer.studentId,
      college: 'Osmania University',
      graduationYear: 2025,
      attendanceHealthPercentage: 88.5,
    });
    peerProfiles.push({ user: pUser, profile: pProf });
  }

  console.log('[Seed] Creating Node.js Backend Development Course & 8 Modules...');
  const course = await Course.create({
    courseCode: 'NODE-FULLSTACK',
    title: 'Node.js Backend Development',
    description: 'Comprehensive industry-aligned backend engineering program covering asynchronous patterns, runtime architecture, Express.js microservices, MongoDB, security, and scalable deployments.',
    durationWeeks: 12,
    level: 'COMPREHENSIVE',
    status: 'ACTIVE',
    thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?auto=format&fit=crop&q=80&w=400',
  });

  const modulesInfo = [
    {
      num: 1,
      title: 'Development Environment Setup',
      desc: 'Setting up Node.js LTS, nvm, TypeScript compiler, modern debugging tools, and git workflows.',
      lessons: [
        { num: 1, title: 'Node.js LTS Installation & Version Management (nvm)', duration: 90 },
        { num: 2, title: 'TypeScript Tooling, tsconfig Architecture & ESLint', duration: 90 },
      ],
    },
    {
      num: 2,
      title: 'JavaScript Fundamentals for Backend',
      desc: 'Execution context, call stack, closures, prototypes, ES6+ modules, Promises, and async/await.',
      lessons: [
        { num: 1, title: 'Scope Chain, Closures & Context Binding', duration: 90 },
        { num: 2, title: 'Asynchronous JavaScript: Event Loop, Microtasks & Promises', duration: 90 },
      ],
    },
    {
      num: 3,
      title: 'Node.js Fundamentals & Event Loop Architecture',
      desc: 'Deep dive into libuv, thread pools, event demultiplexing, non-blocking I/O microtasks, process.nextTick, streams, and buffers.',
      lessons: [
        { num: 1, title: 'Introduction to Node.js & Event Loop Architecture', duration: 90 },
        { num: 2, title: 'Streams, Buffers & Backpressure Handling', duration: 90 },
        { num: 3, title: 'Building HTTP Servers with Core Modules', duration: 90 },
      ],
    },
    {
      num: 4,
      title: 'Express.js Web Framework',
      desc: 'Middleware pipeline, routing controllers, request validation with Zod, error handling, and rate limiting.',
      lessons: [
        { num: 1, title: 'Express Routing & Middleware Architecture', duration: 90 },
        { num: 2, title: 'Request Validation, File Uploads with Multer & Error Handlers', duration: 90 },
      ],
    },
    {
      num: 5,
      title: 'MongoDB and Mongoose ODM',
      desc: 'NoSQL modeling, indexing strategies, aggregation pipeline, transactions, and performance tuning.',
      lessons: [
        { num: 1, title: 'Mongoose Schemas, Compound Indexes & Population', duration: 90 },
        { num: 2, title: 'Aggregation Pipelines & High-Performance Queries', duration: 90 },
      ],
    },
    {
      num: 6,
      title: 'Authentication and Authorization',
      desc: 'JWT token signing, refresh token rotation, bcrypt password security, and Role-Based Access Control (RBAC).',
      lessons: [
        { num: 1, title: 'Secure Authentication with JWT & HTTP-Only Cookies', duration: 90 },
        { num: 2, title: 'Role-Based Access Control (RBAC) & Permission Matrices', duration: 90 },
      ],
    },
    {
      num: 7,
      title: 'Real-World Backend Projects & WebSockets',
      desc: 'Real-time two-way communication using Socket.IO, attendance engines, and payment gateway integration.',
      lessons: [
        { num: 1, title: 'Real-time Systems with Socket.IO Rooms & Events', duration: 90 },
        { num: 2, title: 'Building High-Throughput REST & WebSocket APIs', duration: 90 },
      ],
    },
    {
      num: 8,
      title: 'Deployment and Production Basics',
      desc: 'Docker containerization, environment secrets, PM2 process management, CI/CD, and monitoring.',
      lessons: [
        { num: 1, title: 'Docker Containerization for Node.js Services', duration: 90 },
        { num: 2, title: 'Production Security Hardening, Logging & Cloud Deployment', duration: 90 },
      ],
    },
  ];

  const createdModules: any[] = [];
  for (const m of modulesInfo) {
    const mod = await CourseModule.create({
      course: course._id,
      moduleNumber: m.num,
      title: m.title,
      description: m.desc,
      objectives: ['Master theoretical concepts', 'Implement hands-on code examples', 'Complete lab assignments'],
    });

    const lessonIds: any[] = [];
    for (const l of m.lessons) {
      const les = await Lesson.create({
        module: mod._id,
        lessonNumber: l.num,
        title: l.title,
        description: `Comprehensive lesson on ${l.title} with guided lab exercise.`,
        durationMinutes: l.duration,
      });
      lessonIds.push(les._id);
    }

    mod.lessons = lessonIds;
    await mod.save();
    createdModules.push(mod);
  }

  course.modules = createdModules.map((m) => m._id);
  await course.save();

  console.log('[Seed] Creating Batch & Enrollments...');
  const batch = await Batch.create({
    batchCode: 'NODE-B01',
    name: 'Node.js Batch 01',
    course: course._id,
    trainer: trainerUser._id,
    classroom: 'Lab 2, 2nd Floor',
    roomNumber: 'Room 204',
    timing: '10:30 AM - 12:00 PM',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    cohortName: 'Spring Semester • Offline Cohort',
    startDate: new Date('2026-01-15'),
    endDate: new Date('2026-04-30'),
    enrolledStudentsCount: 5,
    maxCapacity: 40,
  });

  trainerProfile.assignedBatches = [batch._id];
  await trainerProfile.save();

  // Enroll Rahul Kumar
  const rahulEnrollment = await Enrollment.create({
    student: studentProfile._id,
    user: studentUser._id,
    course: course._id,
    batch: batch._id,
    enrollmentDate: new Date('2026-01-15'),
    status: 'ACTIVE',
    totalEligibleClasses: 14,
    classesAttended: 12,
    classesLate: 1,
    classesAbsent: 2,
    attendancePercentage: 92.0,
    curriculumProgressPercentage: 35.0,
  });

  // Enroll Peer Students
  for (const peer of peerProfiles) {
    await Enrollment.create({
      student: peer.profile._id,
      user: peer.user._id,
      course: course._id,
      batch: batch._id,
      enrollmentDate: new Date('2026-01-15'),
      status: 'ACTIVE',
      totalEligibleClasses: 14,
      classesAttended: 13,
      classesLate: 0,
      classesAbsent: 1,
      attendancePercentage: 92.8,
      curriculumProgressPercentage: 35.0,
    });
  }

  console.log('[Seed] Creating Class Sessions (Past & Live Today)...');
  const sessionDates = [
    { date: new Date('2026-02-10T10:30:00.000Z'), status: 'COMPLETED', topic: 'JavaScript Asynchronous Patterns & Callbacks' },
    { date: new Date('2026-02-11T10:30:00.000Z'), status: 'COMPLETED', topic: 'Promises, Async/Await & Microtask Queue' },
    { date: new Date('2026-02-12T10:30:00.000Z'), status: 'COMPLETED', topic: 'Buffers, Binary Data & Character Encodings' },
    { date: new Date('2026-02-13T10:30:00.000Z'), status: 'COMPLETED', topic: 'File System Operations & Asynchronous I/O' },
  ];

  for (let i = 0; i < sessionDates.length; i++) {
    const s = sessionDates[i];
    const sess = await ClassSession.create({
      sessionCode: `SESS-2026-02-${10 + i}-01`,
      batch: batch._id,
      course: course._id,
      trainer: trainerUser._id,
      topicTitle: s.topic,
      moduleLabel: 'Module 02 • Core Fundamentals',
      classroom: 'Lab 2, 2nd Floor • Naprocs Tech Center',
      roomNumber: 'Room 204',
      sessionDate: s.date,
      startTime: '10:30 AM',
      endTime: '12:00 PM',
      status: 'COMPLETED',
    });

    // Create Past Attendance Record for Rahul Kumar
    const statuses: ('PRESENT' | 'LATE')[] = ['PRESENT', 'PRESENT', 'LATE', 'PRESENT'];
    const times = ['10:28 AM', '10:25 AM', '10:38 AM', '10:22 AM'];
    const checkInDate = new Date(s.date);
    checkInDate.setHours(10, i === 2 ? 38 : 25, 0);

    await AttendanceRecord.create({
      classSession: sess._id,
      student: studentProfile._id,
      user: studentUser._id,
      batch: batch._id,
      course: course._id,
      attendanceDate: s.date,
      checkInTime: checkInDate,
      status: statuses[i],
      verificationMethod: 'QR_SCAN',
    });
  }

  // Today's Live Class Session (Module 03 • Core Systems)
  const todayLiveSession = await ClassSession.create({
    sessionCode: 'SESS-2026-02-14-LIVE',
    batch: batch._id,
    course: course._id,
    trainer: trainerUser._id,
    topicTitle: 'Introduction to Node.js & Event Loop Architecture',
    moduleLabel: 'Module 03 • Core Systems',
    description: 'Deep dive into libuv, thread pools, event demultiplexing, non-blocking I/O microtasks, and process.nextTick lifecycle.',
    classroom: 'Lab 2, 2nd Floor',
    roomNumber: 'Room 204',
    sessionDate: new Date(),
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    status: 'LIVE',
    startedAt: new Date(Date.now() - 48 * 60 * 1000), // started 48 mins ago
  });

  // Create Active Attendance Session with rolling QR token
  const attendanceSession = await AttendanceSession.create({
    classSession: todayLiveSession._id,
    batch: batch._id,
    trainer: trainerUser._id,
    status: 'ACTIVE',
    openedAt: new Date(Date.now() - 40 * 60 * 1000),
    totalEligible: 5,
    totalPresent: 2, // 2 peers already checked in
    totalLate: 0,
    totalAbsent: 0,
  });

  const { token, expiresAt } = AttendanceTokenService.generateToken(
    attendanceSession._id.toString(),
    todayLiveSession._id.toString(),
    batch._id.toString(),
    1,
    30
  );

  attendanceSession.currentRollingToken = token;
  attendanceSession.tokenExpiresAt = expiresAt;
  attendanceSession.tokenSequence = 1;
  await attendanceSession.save();

  todayLiveSession.activeAttendanceSession = attendanceSession._id;
  await todayLiveSession.save();

  // Peer 1 & 2 marked attendance
  for (let i = 0; i < 2; i++) {
    await AttendanceRecord.create({
      attendanceSession: attendanceSession._id,
      classSession: todayLiveSession._id,
      student: peerProfiles[i].profile._id,
      user: peerProfiles[i].user._id,
      batch: batch._id,
      course: course._id,
      attendanceDate: new Date(),
      checkInTime: new Date(Date.now() - 30 * 60 * 1000),
      status: 'PRESENT',
      verificationMethod: 'QR_SCAN',
    });
  }

  console.log('[Seed] Creating Assignments...');
  const assignment1 = await Assignment.create({
    title: 'Assignment 04: Build HTTP Server with Core Modules',
    description: 'Construct a standalone HTTP server using Node.js standard modules (http, url, fs, path) without Express. Handle static files, JSON payloads, and basic routing.',
    course: course._id,
    batch: batch._id,
    trainer: trainerUser._id,
    moduleLabel: 'Module 3: Core HTTP & URL routing',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    totalPoints: 20,
    githubTemplateUrl: 'https://github.com/naprocs-templates/node-http-starter',
    instructions: '1. Fork template\n2. Implement URL routing\n3. Add 404 handler\n4. Submit GitHub repo link',
    status: 'PUBLISHED',
  });

  const assignment2 = await Assignment.create({
    title: 'Lab 03: File System & Streams Pipeline',
    description: 'Implement a stream pipeline processing large CSV files with backpressure handling using pipeline() and Transform streams.',
    course: course._id,
    batch: batch._id,
    trainer: trainerUser._id,
    moduleLabel: 'Module 3: Streams & Performance',
    dueDate: new Date(Date.now() - 48 * 60 * 60 * 1000),
    totalPoints: 20,
    status: 'CLOSED',
  });

  // Rahul Kumar's graded submission for Lab 03
  await AssignmentSubmission.create({
    assignment: assignment2._id,
    student: studentProfile._id,
    user: studentUser._id,
    githubRepoUrl: 'https://github.com/rahulkumar-dev/node-streams-pipeline',
    liveDemoUrl: 'https://rahulkumar-streams.demo.com',
    notes: 'Implemented transform stream with chunk chunking and memory monitoring.',
    status: 'GRADED',
    score: 19,
    mentorFeedback: 'Excellent clean error handling and stream backpressure implementation.',
    gradedBy: trainerUser._id,
    gradedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  });

  console.log('[Seed] Creating Quizzes & Questions...');
  const quiz = await Quiz.create({
    title: 'Node.js Core & Async JS Quiz',
    description: '20 Questions • Multiple Choice & Output Evaluation assessing libuv, event loop phases, and async control flows.',
    course: course._id,
    batch: batch._id,
    trainer: trainerUser._id,
    durationMinutes: 20,
    totalQuestions: 5,
    totalPoints: 20,
    passingScore: 14,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    deadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
    isPublished: true,
  });

  const quizQuestions = [
    {
      num: 1,
      prompt: 'In the Node.js event loop, which phase executes callbacks registered with setImmediate()?',
      options: ['Timers Phase', 'Pending Callbacks Phase', 'Poll Phase', 'Check Phase'],
      correct: 3, // Check Phase
      points: 4,
    },
    {
      num: 2,
      prompt: 'When does the process.nextTick() queue get processed?',
      options: [
        'Immediately after the current operation finishes, before the event loop continues to the next phase',
        'At the end of the Timers phase',
        'During the Close callbacks phase',
        'In the thread pool asynchronously',
      ],
      correct: 0,
      points: 4,
    },
    {
      num: 3,
      prompt: 'Which underlying C library provides the cross-platform asynchronous I/O and thread pool in Node.js?',
      options: ['V8 Engine', 'libuv', 'OpenSSL', 'zlib'],
      correct: 1, // libuv
      points: 4,
    },
    {
      num: 4,
      prompt: 'What happens when a readable stream emits data faster than a writable stream can consume it?',
      options: [
        'Memory leak or high memory consumption without backpressure',
        'The readable stream crashes automatically',
        'Node.js automatically allocates virtual disk swap',
        'The operating system suspends the process',
      ],
      correct: 0,
      points: 4,
    },
    {
      num: 5,
      prompt: 'Which method safely joins stream pipelines and automatically cleans up descriptors on error?',
      options: ['stream.pipe()', 'stream.pipeline()', 'stream.concat()', 'stream.through()'],
      correct: 1, // stream.pipeline()
      points: 4,
    },
  ];

  for (const q of quizQuestions) {
    await QuizQuestion.create({
      quiz: quiz._id,
      questionNumber: q.num,
      prompt: q.prompt,
      options: q.options,
      correctOptionIndex: q.correct,
      points: q.points,
      explanation: 'Refer to Module 3: Event Loop Architecture deep dive notes.',
    });
  }

  console.log('[Seed] Creating Study Materials...');
  await StudyMaterial.create([
    {
      title: 'Event Loop Deep Dive Notes.pdf',
      description: 'Comprehensive architectural diagrams covering libuv, poll phase, thread pools, and process.nextTick.',
      course: course._id,
      moduleLabel: 'Module 3',
      fileType: 'PDF',
      fileUrl: '/materials/event-loop-deep-dive-notes.pdf',
      fileSizeBytes: 4.8 * 1024 * 1024,
      fileSizeFormatted: '4.8 MB',
      category: 'Lecture Notes',
      uploadedBy: trainerUser._id,
    },
    {
      title: 'module-03-streams-demo.zip',
      description: 'Clean starter project with transform stream pipelines and benchmark scripts.',
      course: course._id,
      moduleLabel: 'Module 3',
      fileType: 'ZIP',
      fileUrl: '/materials/module-03-streams-demo.zip',
      fileSizeBytes: 1.2 * 1024 * 1024,
      fileSizeFormatted: '1.2 MB',
      category: 'Code Starter',
      uploadedBy: trainerUser._id,
    },
  ]);

  console.log('[Seed] Creating Announcements & Institute Notices...');
  await Announcement.create([
    {
      title: 'Special Workshop: Docker & Cloud Deployment next Saturday by Guest Architect',
      description: 'Mandatory technical session with industry enterprise architect covering containerization and AWS ECS.',
      priority: 'PRIORITY',
      targetAudience: 'ALL',
      locationScope: 'Mandatory for Batch 01 • Main Auditorium',
      publishedBy: adminUser._id,
      publishDate: new Date('2026-02-13'),
    },
    {
      title: 'Lab 2 Hardware Upgrade completed. Faster NVMe SSD environments ready.',
      description: 'High-speed local caching enabled. Terminal workstations 01 through 40 synced.',
      priority: 'FACILITY',
      targetAudience: 'ALL',
      locationScope: 'Terminal workstations 01 through 40 synced.',
      publishedBy: adminUser._id,
      publishDate: new Date('2026-02-11'),
    },
  ]);

  console.log('[Seed] Creating Institute Settings...');
  await InstituteSettings.create({
    instituteName: 'Naprocs Skill Development Center',
    portalSubtitle: 'Node.js & Software Training Hub',
    contactEmail: 'contact@naprocs.com',
    contactPhone: '+91 98765 43210',
    address: 'Naprocs Tech Center, Lab 2, 2nd Floor, Hi-Tech City, Hyderabad',
    timezone: 'Asia/Kolkata',
    qrRefreshIntervalSeconds: 30,
    qrLateToleranceMinutes: 15,
    qrAbsentToleranceMinutes: 45,
    antiProxyStrictness: 'MODERATE',
    requireTrainerFinalization: true,
  });

  console.log('================================================================');
  console.log('  🎉 Database Seeding Completed Successfully!');
  console.log('  Accounts Created:');
  console.log('  - Student: student@naprocs.com / Student@12345 (Rahul Kumar)');
  console.log('  - Trainer: trainer@naprocs.com / Trainer@12345 (Dr. V. Sundaram)');
  console.log('  - Admin:   admin@naprocs.com   / Admin@12345   (Institute Director)');
  console.log('  Active Live Session: "Introduction to Node.js & Event Loop"');
  console.log('  Active Rolling QR Token: ' + token);
  console.log('================================================================');
}

// Run if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}
