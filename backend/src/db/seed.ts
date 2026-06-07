import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { connectMongo, pgPool } from '../config/db';
import { User, Department } from '../models';
import dotenv from 'dotenv';

dotenv.config();

// Standard password for seeded test users
const SEED_PASSWORD = 'Password@2026';

// Helper to hash passwords
const hashPassword = async (pwd: string): Promise<string> => {
  return bcrypt.hash(pwd, 10);
};

// Helper to get random number in range
const getRandomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

// Helper to get random item from array
const getRandomItem = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

export const seedDatabase = async () => {
  try {
    console.log('[Seeder] Starting database seeding...');

    // 1. Connect databases
    await connectMongo();
    
    // Clear MongoDB data
    console.log('[Seeder] Cleaning MongoDB collections...');
    await User.deleteMany({});
    await Department.deleteMany({});

    // Clear PostgresSQL data
    console.log('[Seeder] Cleaning PostgreSQL tables...');
    await pgPool.query('TRUNCATE TABLE attendance, leave_balances, leave_requests, payroll_structures, payroll_runs, performance_reviews, goals, recruitment_pipeline, system_alerts CASCADE');

    const hashedSeedPassword = await hashPassword(SEED_PASSWORD);
    const hashedAdminPassword = await hashPassword(process.env.ADMIN_PASSWORD || 'AdminPassword@2026');

    // 2. Seed Departments
    console.log('[Seeder] Seeding Departments...');
    const depts = [
      { name: 'Engineering', code: 'ENG', description: 'Software Development, QA, and IT infrastructure', budget: 12000000 },
      { name: 'Human Resources', code: 'HR', description: 'Talent Acquisition, Employee Engagement, and Payroll', budget: 3000000 },
      { name: 'Marketing & Sales', code: 'MKT', description: 'Brand marketing, Lead generation, and Customer Success', budget: 5000000 },
      { name: 'Finance', code: 'FIN', description: 'Financial planning, accounting, and compliance', budget: 2500000 },
      { name: 'Operations', code: 'OPS', description: 'Facilities, logistics, and office management', budget: 2000000 },
    ];

    const seededDepts = await Department.insertMany(depts);
    console.log(`[Seeder] Seeded ${seededDepts.length} departments.`);

    const engDept = seededDepts.find(d => d.code === 'ENG')!;
    const hrDept = seededDepts.find(d => d.code === 'HR')!;
    const mktDept = seededDepts.find(d => d.code === 'MKT')!;
    const finDept = seededDepts.find(d => d.code === 'FIN')!;
    const opsDept = seededDepts.find(d => d.code === 'OPS')!;

    // 3. Seed Users
    console.log('[Seeder] Seeding Users...');

    // A. Seed Admin
    const adminUser = await User.create({
      employeeId: 'FWC-2026-000',
      firstName: 'FWC',
      lastName: 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@fwcit.com',
      passwordHash: hashedAdminPassword,
      role: 'admin',
      gender: 'prefer_not_to_say',
      isActive: true,
      isEmailVerified: true,
      skills: ['System Administration', 'Operations', 'Leadership'],
      employmentDetails: {
        designation: 'System Administrator',
        employmentType: 'full_time',
        joiningDate: new Date('2024-01-01'),
        workMode: 'onsite',
        noticePeriod: 90,
      },
    });

    // B. Seed Managers
    const managersData = [
      {
        firstName: 'Rajiv',
        lastName: 'Singh',
        email: 'rajiv.singh@fwcit.com',
        dept: engDept._id,
        designation: 'Engineering Manager',
        skills: ['Node.js', 'React', 'Team Leadership', 'Agile'],
      },
      {
        firstName: 'Aarav',
        lastName: 'Sen',
        email: 'aarav.sen@fwcit.com',
        dept: hrDept._id,
        designation: 'HR Manager',
        skills: ['HR Policies', 'Employee Relations', 'Conflict Resolution'],
      },
      {
        firstName: 'Karan',
        lastName: 'Johar',
        email: 'karan.johar@fwcit.com',
        dept: mktDept._id,
        designation: 'Marketing Director',
        skills: ['Brand Strategy', 'Product Marketing', 'Growth Hacking'],
      },
    ];

    const seededManagers = [];
    let empSeq = 1;
    for (const mgr of managersData) {
      const seqStr = String(empSeq++).padStart(3, '0');
      const user = await User.create({
        employeeId: `FWC-2026-${seqStr}`,
        firstName: mgr.firstName,
        lastName: mgr.lastName,
        email: mgr.email,
        passwordHash: hashedSeedPassword,
        role: 'manager',
        department: mgr.dept,
        gender: 'male',
        isActive: true,
        isEmailVerified: true,
        skills: mgr.skills,
        employmentDetails: {
          designation: mgr.designation,
          employmentType: 'full_time',
          joiningDate: new Date('2024-06-01'),
          workMode: 'hybrid',
          noticePeriod: 60,
        },
        createdBy: adminUser._id,
      });
      seededManagers.push(user);
    }

    const engManager = seededManagers.find(m => m.email.includes('rajiv'))!;
    const hrManager = seededManagers.find(m => m.email.includes('aarav'))!;
    const mktManager = seededManagers.find(m => m.email.includes('karan'))!;

    // Update departments with head IDs
    engDept.headId = engManager._id;
    await engDept.save();
    hrDept.headId = hrManager._id;
    await hrDept.save();
    mktDept.headId = mktManager._id;
    await mktDept.save();

    // C. Seed Recruiters
    const recruitersData = [
      {
        firstName: 'Shalini',
        lastName: 'Dey',
        email: 'shalini.dey@fwcit.com',
        dept: hrDept._id,
        designation: 'Senior Talent Acquisition',
        skills: ['Technical Recruiting', 'Sourcing', 'ATS Management'],
      },
      {
        firstName: 'Preeti',
        lastName: 'Sen',
        email: 'preeti.sen@fwcit.com',
        dept: hrDept._id,
        designation: 'HR Recruiter',
        skills: ['Sourcing', 'Interviewing', 'Candidate Coordination'],
      },
    ];

    const seededRecruiters = [];
    for (const rec of recruitersData) {
      const seqStr = String(empSeq++).padStart(3, '0');
      const user = await User.create({
        employeeId: `FWC-2026-${seqStr}`,
        firstName: rec.firstName,
        lastName: rec.lastName,
        email: rec.email,
        passwordHash: hashedSeedPassword,
        role: 'hr_recruiter',
        department: rec.dept,
        reportingManagerId: hrManager._id,
        gender: 'female',
        isActive: true,
        isEmailVerified: true,
        skills: rec.skills,
        employmentDetails: {
          designation: rec.designation,
          employmentType: 'full_time',
          joiningDate: new Date('2025-01-15'),
          workMode: 'hybrid',
          noticePeriod: 45,
        },
        createdBy: adminUser._id,
      });
      seededRecruiters.push(user);
    }

    // D. Seed Employees
    const employeesData = [
      // Engineering
      { firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@fwcit.com', dept: engDept._id, mgr: engManager._id, desg: 'Software Engineer', skills: ['React', 'TypeScript', 'TailwindCSS'], salary: 850000 },
      { firstName: 'Rajesh', lastName: 'Kumar', email: 'rajesh.kumar@fwcit.com', dept: engDept._id, mgr: engManager._id, desg: 'Backend Developer', skills: ['Node.js', 'Express', 'MongoDB', 'PostgreSQL'], salary: 900000 },
      { firstName: 'Arjun', lastName: 'Mehta', email: 'arjun.mehta@fwcit.com', dept: engDept._id, mgr: engManager._id, desg: 'Full Stack Engineer', skills: ['React', 'Node.js', 'Docker', 'Redis'], salary: 1100000 },
      { firstName: 'Vikram', lastName: 'Singh', email: 'vikram.singh@fwcit.com', dept: engDept._id, mgr: engManager._id, desg: 'QA Engineer', skills: ['Selenium', 'Cypress', 'Jest', 'API Testing'], salary: 700000 },
      // Marketing
      { firstName: 'Rohan', lastName: 'Verma', email: 'rohan.verma@fwcit.com', dept: mktDept._id, mgr: mktManager._id, desg: 'SEO Specialist', skills: ['Google Analytics', 'SEO', 'Content Strategy'], salary: 600000 },
      { firstName: 'Sanjay', lastName: 'Kumar', email: 'sanjay.kumar@fwcit.com', dept: mktDept._id, mgr: mktManager._id, desg: 'Sales Manager', skills: ['Lead Generation', 'Sales Pitch', 'Negotiation'], salary: 750000 },
      // Finance
      { firstName: 'Amit', lastName: 'Patel', email: 'amit.patel@fwcit.com', dept: finDept._id, mgr: hrManager._id, desg: 'Financial Analyst', skills: ['Accounting', 'Financial Modeling', 'Excel'], salary: 800000 },
      { firstName: 'Pooja', lastName: 'Joshi', email: 'pooja.joshi@fwcit.com', dept: finDept._id, mgr: hrManager._id, desg: 'Accountant', skills: ['GST Filing', 'Bookkeeping', 'Tally'], salary: 550000 },
      // Operations
      { firstName: 'Divya', lastName: 'Nair', email: 'divya.nair@fwcit.com', dept: opsDept._id, mgr: hrManager._id, desg: 'Operations Lead', skills: ['Logistics', 'Vendor Management', 'Procurement'], salary: 720000 },
      { firstName: 'Sunita', lastName: 'Rao', email: 'sunita.rao@fwcit.com', dept: opsDept._id, mgr: hrManager._id, desg: 'Operations Associate', skills: ['Logistics', 'Inventory Management'], salary: 480000 },
    ];

    const seededEmployees = [];
    for (const emp of employeesData) {
      const seqStr = String(empSeq++).padStart(3, '0');
      const user = await User.create({
        employeeId: `FWC-2026-${seqStr}`,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        passwordHash: hashedSeedPassword,
        role: 'employee',
        department: emp.dept,
        reportingManagerId: emp.mgr,
        gender: getRandomItem(['male', 'female']),
        isActive: true,
        isEmailVerified: true,
        skills: emp.skills,
        employmentDetails: {
          designation: emp.desg,
          employmentType: 'full_time',
          joiningDate: new Date('2025-03-01'),
          workMode: 'hybrid',
          noticePeriod: 60,
        },
        createdBy: adminUser._id,
      });

      // E. Seed PostgreSQL table: payroll_structures for this employee
      const ctc = emp.salary;
      const basic = ctc * 0.4; // 40% of CTC
      const hra = ctc * 0.2;  // 20% of CTC
      const special = ctc - (basic + hra); // remaining
      const pfEmployee = basic * 0.12; // 12% of basic
      const pfEmployer = basic * 0.12;
      const esiEmployee = ctc < 250000 ? ctc * 0.0075 : 0; // standard ESI rule approx
      const esiEmployer = ctc < 250000 ? ctc * 0.0325 : 0;

      await pgPool.query(`
        INSERT INTO payroll_structures (
          employee_id, effective_from, ctc_annual, basic, hra, special_allowance, 
          pf_employee, pf_employer, esi_employee, esi_employer, professional_tax, tds, other_deductions, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        user.employeeId,
        '2025-03-01',
        ctc,
        basic / 12,
        hra / 12,
        special / 12,
        pfEmployee / 12,
        pfEmployer / 12,
        esiEmployee / 12,
        esiEmployer / 12,
        200, // standard professional tax per month
        (ctc * 0.05) / 12, // 5% flat estimated TDS for simplicity
        0,
        true,
        adminUser.employeeId
      ]);

      // F. Seed PostgreSQL table: leave_balances for this employee
      const leaveTypes = ['casual', 'sick', 'earned'];
      const year = 2026;
      for (const lt of leaveTypes) {
        let totalDays = 12.0;
        if (lt === 'sick') totalDays = 8.0;
        if (lt === 'earned') totalDays = 15.0;

        await pgPool.query(`
          INSERT INTO leave_balances (employee_id, year, leave_type, total_days, used_days, pending_days, carried_forward)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          user.employeeId,
          year,
          lt,
          totalDays,
          0.0, // used
          0.0, // pending
          0.0  // carried forward
        ]);
      }

      seededEmployees.push(user);
    }
    console.log(`[Seeder] Seeded ${seededEmployees.length} employee records and payroll structures.`);

    // 3.5. Seed Leaves, Performance Reviews, and System Alerts
    console.log('[Seeder] Seeding leaves requests, performance reviews, and system alerts...');
    
    // Seed Leave Requests
    const leaveRequestsToSeed = [
      { empId: 'FWC-2026-006', type: 'casual', from: '2026-06-10', to: '2026-06-12', days: 3.0, reason: 'Family vacation', status: 'pending' },
      { empId: 'FWC-2026-007', type: 'sick', from: '2026-06-08', to: '2026-06-09', days: 2.0, reason: 'Viral fever', status: 'pending' },
      { empId: 'FWC-2026-010', type: 'earned', from: '2026-05-15', to: '2026-05-19', days: 5.0, reason: 'Sister marriage', status: 'approved' },
      { empId: 'FWC-2026-012', type: 'casual', from: '2026-06-01', to: '2026-06-02', days: 2.0, reason: 'Personal chores', status: 'approved' }
    ];
    for (const lr of leaveRequestsToSeed) {
      await pgPool.query(`
        INSERT INTO leave_requests (employee_id, leave_type, from_date, to_date, days, reason, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [lr.empId, lr.type, lr.from, lr.to, lr.days, lr.reason, lr.status]);
    }

    // Seed Performance Reviews
    const perfReviewsToSeed = [
      { empId: 'FWC-2026-006', rating: 'A+', score: 4.65, reviewer: 'FWC-2026-001', comments: 'Outstanding technical contributions.', employeeComments: 'Enjoyed working on the Next.js migration.' },
      { empId: 'FWC-2026-007', rating: 'A', score: 4.20, reviewer: 'FWC-2026-001', comments: 'Good backend API delivery.', employeeComments: 'Will focus on optimizing DB queries.' },
      { empId: 'FWC-2026-008', rating: 'A+', score: 4.70, reviewer: 'FWC-2026-001', comments: 'Excellent full-stack velocity.', employeeComments: 'Excited about the AI features.' },
      { empId: 'FWC-2026-009', rating: 'B', score: 3.90, reviewer: 'FWC-2026-001', comments: 'Solid QA coverage.', employeeComments: 'Aiming for automation growth.' },
      { empId: 'FWC-2026-010', rating: 'B', score: 3.80, reviewer: 'FWC-2026-003', comments: 'Meets SEO targets.', employeeComments: 'Working on new organic campaigns.' }
    ];
    for (const pr of perfReviewsToSeed) {
      await pgPool.query(`
        INSERT INTO performance_reviews (employee_id, reviewer_id, review_period, review_type, status, overall_score, rating, manager_comments, employee_comments, submitted_at)
        VALUES ($1, $2, 'Q1 2026', 'quarterly', 'submitted', $3, $4, $5, $6, NOW())
      `, [pr.empId, pr.reviewer, pr.score, pr.rating, pr.comments, pr.employeeComments]);
    }

    // Seed System Alerts
    const alertsToSeed = [
      { type: 'compliance', title: '3 employees missing compliance docs', desc: 'Mandatory PAN/Aadhaar details and signing of NDA are missing. Deadline is in 2 days.', action: 'Request Docs' },
      { type: 'payroll', title: 'Payroll processing due June 10', desc: 'May/June payroll processing is pending 42 administrative check approvals.', action: 'Approve Run' },
      { type: 'onboarding', title: '4 new hire onboarding tasks overdue', desc: 'Onboarding checklist for Rajesh and Arjun has pending task approvals overdue by >3 days.', action: 'Escalate Tasks' },
      { type: 'recruitment', title: 'AI screening completed - DevOps role', desc: '12 candidates shortlisted by Gemini AI agent for the DevOps role. Review and approve candidate shortlisting.', action: 'Accept Candidates' }
    ];
    for (const alt of alertsToSeed) {
      await pgPool.query(`
        INSERT INTO system_alerts (type, title, description, status, action_label)
        VALUES ($1, $2, $3, 'pending', $4)
      `, [alt.type, alt.title, alt.desc, alt.action]);
    }

    // 4. Seed 60 Days of Attendance Records in PostgreSQL
    console.log('[Seeder] Seeding 60 days of attendance history...');
    
    // We will generate history for seeded managers, recruiters, and employees
    const attendanceUsers = [...seededManagers, ...seededRecruiters, ...seededEmployees];
    
    const today = new Date();
    const recordsToSeed = [];

    // Let's seed for 60 calendar days back
    for (let dayOffset = 60; dayOffset >= 0; dayOffset--) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - dayOffset);
      
      const dayOfWeek = checkDate.getDay();
      
      // Skip weekends (Sunday=0, Saturday=6)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }

      const dateString = checkDate.toISOString().split('T')[0];

      for (const u of attendanceUsers) {
        // Randomly simulate absenteeism (5% chance)
        const randVal = Math.random();
        if (randVal < 0.05) {
          // Absent
          recordsToSeed.push({
            employee_id: u.employeeId,
            date: dateString,
            check_in: null,
            check_out: null,
            total_hours: 0,
            status: 'absent',
            notes: 'Unexcused absence',
          });
          continue;
        } else if (randVal < 0.08) {
          // On Leave
          recordsToSeed.push({
            employee_id: u.employeeId,
            date: dateString,
            check_in: null,
            check_out: null,
            total_hours: 0,
            status: 'on_leave',
            notes: 'Approved sick/casual leave',
          });
          continue;
        }

        // Simulating normal work day check-in/out
        // Check in between 8:30 AM and 10:00 AM
        const checkInHour = getRandomRange(8.5, 10.0); // decimal hours
        const checkInMinutes = Math.floor((checkInHour % 1) * 60);
        const checkInHourInt = Math.floor(checkInHour);

        const checkInTime = new Date(checkDate);
        checkInTime.setHours(checkInHourInt, checkInMinutes, 0, 0);

        // Check out between 5:30 PM (17.5) and 7:00 PM (19.0)
        const checkOutHour = getRandomRange(17.5, 19.0);
        const checkOutMinutes = Math.floor((checkOutHour % 1) * 60);
        const checkOutHourInt = Math.floor(checkOutHour);

        const checkOutTime = new Date(checkDate);
        checkOutTime.setHours(checkOutHourInt, checkOutMinutes, 0, 0);

        // Compute total hours worked
        const diffMs = checkOutTime.getTime() - checkInTime.getTime();
        const totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

        // Status is 'late' if checked in after 9:15 AM
        let status = 'present';
        if (checkInHour > 9.25) {
          status = 'late';
        }

        // Randomly mark 15% as work from home
        if (Math.random() < 0.15) {
          status = 'work_from_home';
        }

        recordsToSeed.push({
          employee_id: u.employeeId,
          date: dateString,
          check_in: checkInTime,
          check_out: checkOutTime,
          total_hours: totalHours,
          status: status,
          notes: status === 'late' ? 'Late arrival due to traffic' : 'Regular workday check-in',
        });
      }
    }

    // Bulk insert attendance records in chunks of 500 to keep it efficient
    console.log(`[Seeder] Inserting ${recordsToSeed.length} attendance records in PostgreSQL...`);
    
    for (let i = 0; i < recordsToSeed.length; i += 500) {
      const chunk = recordsToSeed.slice(i, i + 500);
      const valuesQuery = chunk.map((_, idx) => {
        const base = idx * 8;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
      }).join(', ');

      const queryParams = chunk.flatMap(r => [
        r.employee_id,
        r.date,
        r.check_in,
        r.check_out,
        r.total_hours,
        r.status,
        '127.0.0.1', // mock check_in_ip
        r.notes
      ]);

      await pgPool.query(`
        INSERT INTO attendance (employee_id, date, check_in, check_out, total_hours, status, check_in_ip, notes)
        VALUES ${valuesQuery}
        ON CONFLICT (employee_id, date) DO NOTHING
      `, queryParams);
    }
    
    console.log(`[Seeder] Seeded attendance records successfully.`);
    console.log('[Seeder] Database seeding completed successfully.');
  } catch (err) {
    console.error('[Seeder] Error during seeding:', err);
    throw err;
  }
};

// Run directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('[Seeder] Complete. Closing connections.');
      mongoose.disconnect();
      pgPool.end();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seeder] Failed:', err);
      mongoose.disconnect();
      pgPool.end();
      process.exit(1);
    });
}
