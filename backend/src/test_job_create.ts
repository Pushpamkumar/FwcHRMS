import { connectMongo } from './config/db';
import { Department, JobPosting, User } from './models';
import mongoose from 'mongoose';

const testCreate = async () => {
  try {
    await connectMongo();
    
    // Find a department
    const dept = await Department.findOne({});
    if (!dept) {
      console.log('[Test] No department found in database.');
      process.exit(1);
    }
    console.log(`[Test] Using department: ${dept.name} (${dept._id})`);

    // Find an admin user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('[Test] No admin user found in database.');
      process.exit(1);
    }

    // Try creating a job posting
    const job = await JobPosting.create({
      title: 'Senior DevOps Architect',
      departmentId: dept._id,
      postedBy: admin._id,
      description: 'Test job description for DevOps architect role.',
      requirements: {
        minExperience: 5,
        maxExperience: 10,
        requiredSkills: ['AWS', 'Kubernetes', 'Terraform'],
        education: 'B.Tech / MCA',
        location: 'Pune (Hybrid)',
      },
      salaryRange: {
        min: 1200000,
        max: 2200000,
        currency: 'INR',
      },
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
    });

    console.log('[Test] Job created successfully in Mongo:', job._id);

    // Clean up test job
    await JobPosting.deleteOne({ _id: job._id });
    console.log('[Test] Cleaned up test job.');

    mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('[Test] Job creation failed:', err.message);
    console.error(err);
    mongoose.disconnect();
    process.exit(1);
  }
};

testCreate();
