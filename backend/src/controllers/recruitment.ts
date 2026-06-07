import { Request, Response } from 'express';
import { JobPosting, Resume } from '../models';
import { pgPool } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ==========================================
// 1. CREATE JOB POSTING
// ==========================================
export const createJob = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, departmentId, description, minExperience, maxExperience, requiredSkills, education, location, salaryMin, salaryMax } = req.body;

    if (!title || !departmentId || !description || !requiredSkills || !education || !location) {
      return res.status(400).json({ message: 'Mandatory fields are missing.' });
    }

    const job = await JobPosting.create({
      title,
      departmentId,
      postedBy: req.user?.sub || req.user?.id,
      description,
      requirements: {
        minExperience: minExperience ? parseInt(minExperience) : 0,
        maxExperience: maxExperience ? parseInt(maxExperience) : 10,
        requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : requiredSkills.split(',').map((s: string) => s.trim()),
        education,
        location,
      },
      salaryRange: {
        min: salaryMin ? parseInt(salaryMin) : 0,
        max: salaryMax ? parseInt(salaryMax) : 0,
        currency: 'INR',
      },
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default to 30 days from now
      status: 'active', // default active immediately
    });

    return res.status(201).json({ message: 'Job posting created successfully.', job });
  } catch (err: any) {
    console.error('Create job error:', err);
    return res.status(500).json({ message: err.message || 'Internal server error.' });
  }
};

// ==========================================
// 2. LIST JOB POSTINGS (Public route)
// ==========================================
export const listJobs = async (req: Request, res: Response) => {
  try {
    const jobs = await JobPosting.find({ status: 'active' }).populate('departmentId', 'name code');
    return res.status(200).json(jobs);
  } catch (err) {
    console.error('List jobs error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 3. SUBMIT APPLICATION (Public route)
// ==========================================
export const applyToJob = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { candidateName, candidateEmail, candidatePhone, resumeUrl } = req.body;

    if (!candidateName || !candidateEmail || !resumeUrl) {
      return res.status(400).json({ message: 'Name, email, and resume URL are required.' });
    }

    const job = await JobPosting.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job posting not found.' });
    }

    // Create candidate application document
    const resume = await Resume.create({
      jobPostingId: jobId,
      candidateName,
      candidateEmail: candidateEmail.toLowerCase(),
      candidatePhone,
      resumeUrl,
      applicationStage: 'screening',
    });

    // Increment applications count
    job.applicationsCount += 1;
    job.pipeline.screening += 1;
    await job.save();

    // Trigger AI Screening request directly to Python FastAPI microservice
    // Real-time integration! We will run this async without blocking client response.
    try {
      console.log(`[AI Integration] Triggering automatic resume screening for ${candidateName}...`);
      fetch(`${AI_SERVICE_URL}/ai/screen-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeUrl,
          jobPostingId: jobId,
          requirements: job.requirements
        })
      })
      .then(async (res) => {
        if (!res.ok) throw new Error(`FastAPI responded with status ${res.status}`);
        const screeningResult = (await res.json()) as any;
        
        // Update resume document with Claude API structured response
        resume.aiScreening = {
          overallScore: screeningResult.overallScore,
          status: screeningResult.status,
          scores: screeningResult.scores,
          matchedSkills: screeningResult.matchedSkills,
          missingSkills: screeningResult.missingSkills,
          extractedInfo: screeningResult.extractedInfo,
          aiSummary: screeningResult.aiSummary,
          aiModel: screeningResult.aiModel,
        };

        // If AI recommends shortlisting, advance applicant state automatically
        if (screeningResult.status === 'shortlisted') {
          resume.applicationStage = 'shortlisted';
          job.shortlistedCount += 1;
          job.pipeline.shortlisted += 1;
          job.pipeline.screening -= 1;
          await job.save();
        }

        await resume.save();
        console.log(`[AI Integration] Screening completed. Candidate ${candidateName} overall score: ${screeningResult.overallScore}. Status: ${screeningResult.status}`);
      })
      .catch((err) => {
        console.error('[AI Integration] Resume screening error:', err.message);
      });
    } catch (err: any) {
      console.error('[AI Integration] Connection failed:', err.message);
    }

    return res.status(201).json({
      message: 'Application submitted successfully. AI screening triggered.',
      applicationId: resume._id
    });
  } catch (err) {
    console.error('Apply to job error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 4. GET JOB APPLICATIONS
// ==========================================
export const getApplications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    const applications = await Resume.find({ jobPostingId: jobId }).sort({ appliedAt: -1 });
    return res.status(200).json(applications);
  } catch (err) {
    console.error('Fetch applications error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 5. UPDATE RECRUITMENT PIPELINE STAGE
// ==========================================
export const updateStage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { stage } = req.body; // shortlisted, phone_screen, technical_interview, hr_interview, offer, hired, rejected

    const resume = await Resume.findById(id);
    if (!resume) {
      return res.status(404).json({ message: 'Applicant record not found.' });
    }

    const job = await JobPosting.findById(resume.jobPostingId);
    if (!job) {
      return res.status(404).json({ message: 'Linked job posting not found.' });
    }

    const oldStage = resume.applicationStage;
    if (oldStage === stage) {
      return res.status(200).json({ message: 'Stage unchanged.', resume });
    }

    // Adjust job pipeline counts
    const pipelineKeyMap: Record<string, string> = {
      screening: 'screening',
      shortlisted: 'shortlisted',
      phone_screen: 'phone_screen',
      technical_interview: 'technical_interview',
      hr_interview: 'hr_interview',
      offer: 'offer',
      hired: 'hired',
      rejected: 'rejected'
    };

    const oldKey = pipelineKeyMap[oldStage];
    const newKey = pipelineKeyMap[stage];

    // Decrement old key if exists
    if (oldKey && (job.pipeline as any)[oldKey] !== undefined) {
      (job.pipeline as any)[oldKey] = Math.max(0, (job.pipeline as any)[oldKey] - 1);
    }
    // Increment new key if exists
    if (newKey && (job.pipeline as any)[newKey] !== undefined) {
      (job.pipeline as any)[newKey] = ((job.pipeline as any)[newKey] || 0) + 1;
    }

    resume.applicationStage = stage;
    await resume.save();
    await job.save();

    console.log(`[Recruitment] Advanced candidate ${resume.candidateName} from ${oldStage} to ${stage}.`);

    return res.status(200).json({ message: 'Applicant stage updated.', resume });
  } catch (err) {
    console.error('Update applicant stage error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
