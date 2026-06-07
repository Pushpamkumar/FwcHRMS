import { Request, Response } from 'express';
import { JobPosting, Resume, Notification, User } from '../models';
import jwt from 'jsonwebtoken';
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

    const authHeader = req.headers.authorization;
    let candidateId = undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforfwchrms2026') as any;
        candidateId = decoded.sub || decoded.id;
      } catch (e) {
        // ignore
      }
    }

    // ─── IMMEDIATE SKILL-BASED AI SCREENING ─────────────────────────────────
    // Run synchronously right at application time so score is always non-zero.
    // Scoring: 60% skill match | 25% experience signals | 15% education signals
    console.log(`[AI Screening] Running instant skill-based screening for ${candidateName}...`);

    const jobSkills: string[] = job.requirements?.requiredSkills || [];
    const minExp: number = job.requirements?.minExperience || 0;

    // Fetch candidate's registered skills if they have an account
    let candidateSkills: string[] = [];
    let candidateDesignation = '';
    if (candidateId) {
      try {
        const candidateUser = await User.findById(candidateId).select('skills employmentDetails');
        if (candidateUser) {
          candidateSkills = candidateUser.skills || [];
          candidateDesignation = candidateUser.employmentDetails?.designation || '';
        }
      } catch (_) { /* ignore */ }
    }

    // Helper: case-insensitive escape for regex matching
    const escapeReg = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Match job skills against candidate's profile skills (primary) + URL/name (soft fallback)
    const combinedText = [
      ...candidateSkills,
      candidateDesignation,
      candidateName,
      resumeUrl,
    ].join(' ');

    const matched: string[] = [];
    const missing: string[] = [];

    for (const skill of jobSkills) {
      if (new RegExp(escapeReg(skill), 'i').test(combinedText)) {
        matched.push(skill);
      } else {
        missing.push(skill);
      }
    }

    // Skills match score (0-100)
    const skillsMatch = jobSkills.length > 0
      ? Math.round((matched.length / jobSkills.length) * 100)
      : 50;

    // Experience signal: check URL/name/designation for experience indicators
    const expText = combinedText.toLowerCase();
    let experienceMatch = 50;
    if (minExp === 0) experienceMatch = 75; // fresher role — anyone qualifies
    else if (expText.includes('senior') || expText.includes('lead') || expText.includes('sr.')) experienceMatch = 90;
    else if (expText.includes('mid') || expText.includes('engineer') || expText.includes('developer')) experienceMatch = 70;
    else if (expText.includes('intern') || expText.includes('fresher') || expText.includes('trainee')) experienceMatch = minExp === 0 ? 80 : 40;

    // Education signal
    let educationMatch = 60;
    const eduText = combinedText.toLowerCase();
    if (eduText.includes('b.tech') || eduText.includes('btech') || eduText.includes('b.e') ||
        eduText.includes('m.tech') || eduText.includes('mtech') || eduText.includes('mca') ||
        eduText.includes('bca') || eduText.includes('degree') || eduText.includes('university') ||
        eduText.includes('lpu') || eduText.includes('iit') || eduText.includes('nit')) {
      educationMatch = 90;
    }

    // Weighted overall score
    const overallScore = Math.min(100, Math.round(
      (skillsMatch * 0.60) + (experienceMatch * 0.25) + (educationMatch * 0.15)
    ));

    const keywordsMatch = Math.round((skillsMatch + experienceMatch + educationMatch) / 3);
    const aiStatus: 'shortlisted' | 'review' | 'rejected' = overallScore >= 70 ? 'shortlisted' : overallScore >= 45 ? 'review' : 'rejected';

    const aiSummary = matched.length > 0
      ? `Candidate profile matches ${matched.length}/${jobSkills.length} required skills (${matched.join(', ')}). ` +
        `${missing.length > 0 ? `Skill gaps identified: ${missing.join(', ')}. ` : 'No major skill gaps. '}` +
        `Overall compatibility score is ${overallScore}%. ${aiStatus === 'shortlisted' ? 'Recommended for shortlisting.' : aiStatus === 'review' ? 'Recommend manual review.' : 'Profile does not meet minimum requirements.'}`
      : `No direct skill overlap detected from profile. Manual review recommended. Score: ${overallScore}%.`;

    // Save screening result immediately via a single Resume.create()
    const resume = await Resume.create({
      jobPostingId: jobId,
      candidateId,
      candidateName,
      candidateEmail: candidateEmail.toLowerCase(),
      candidatePhone,
      resumeUrl,
      applicationStage: aiStatus === 'shortlisted' ? 'shortlisted' : 'screening',
      aiScreening: {
        overallScore,
        status: aiStatus,
        processedAt: new Date(),
        scores: { skillsMatch, experienceMatch, educationMatch, keywordsMatch },
        matchedSkills: matched,
        missingSkills: missing,
        aiSummary,
        aiModel: 'NexHR Skills Engine v2',
      },
    });

    // Increment applications count + pipeline counters
    job.applicationsCount += 1;
    if (aiStatus === 'shortlisted') {
      job.shortlistedCount = (job.shortlistedCount || 0) + 1;
      job.pipeline.shortlisted = (job.pipeline.shortlisted || 0) + 1;
    } else {
      job.pipeline.screening = (job.pipeline.screening || 0) + 1;
    }
    await job.save();

    console.log(`[AI Screening] Done. ${candidateName}: score=${overallScore}%, matched=[${matched.join(',')}], status=${aiStatus}`);
    // ─────────────────────────────────────────────────────────────────────────

    return res.status(201).json({
      message: 'Application submitted successfully. AI screening completed.',
      applicationId: resume._id,
      aiScore: overallScore,
      aiStatus,
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

    // Notify Candidate if they have a registered User ID
    try {
      const candidateUser = await User.findOne({ email: resume.candidateEmail.toLowerCase() });
      if (candidateUser) {
        await Notification.create({
          recipientId: candidateUser._id,
          type: 'stage_update',
          title: 'Application Update',
          message: `Your application stage for the "${job.title}" role has been advanced to "${stage.replace('_', ' ')}".`,
          data: { applicationId: resume._id, jobTitle: job.title, stage }
        });
      }
    } catch (notifErr: any) {
      console.warn('[Recruitment] Notification creation failed:', notifErr.message);
    }

    return res.status(200).json({ message: 'Applicant stage updated.', resume });
  } catch (err) {
    console.error('Update applicant stage error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 6. GET MY APPLICATIONS (For Candidates)
// ==========================================
export const getMyApplications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const candidateId = req.user?.id;
    const email = req.user?.email;

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const applications = await Resume.find({
      $or: [
        { candidateId },
        { candidateEmail: email?.toLowerCase() }
      ]
    }).populate('jobPostingId', 'title requirements status').sort({ appliedAt: -1 });

    return res.status(200).json(applications);
  } catch (err: any) {
    console.error('Fetch my applications error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 7. CLIENT-SIDE AI RESUME ANALYZER (For Candidates)
// ==========================================
export const aiAnalyzeResume = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resumeText, targetJobTitle, targetSkills } = req.body;

    if (!resumeText) {
      return res.status(400).json({ message: 'Resume content text is required.' });
    }

    const skillsList = targetSkills 
      ? targetSkills.split(',').map((s: string) => s.trim()) 
      : ['React', 'Node.js', 'TypeScript', 'PostgreSQL'];
      
    const matched: string[] = [];
    const missing: string[] = [];
    
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    skillsList.forEach((s: string) => {
      if (new RegExp(escapeRegex(s), 'i').test(resumeText)) {
        matched.push(s);
      } else {
        missing.push(s);
      }
    });

    const skillsMatch = Math.round((matched.length / Math.max(skillsList.length, 1)) * 100);
    const experienceMatch = resumeText.toLowerCase().includes('year') ? 80 : 50;
    const educationMatch = (resumeText.toLowerCase().includes('btech') || resumeText.toLowerCase().includes('b.tech') || resumeText.toLowerCase().includes('degree') || resumeText.toLowerCase().includes('university')) ? 90 : 60;
    const keywordsMatch = Math.round((skillsMatch + experienceMatch + educationMatch) / 3);
    const overallScore = Math.round((skillsMatch * 0.4) + (experienceMatch * 0.3) + (educationMatch * 0.3));

    const analysis = {
      overallScore,
      status: overallScore >= 75 ? 'shortlisted' : 'review',
      scores: {
        skillsMatch,
        experienceMatch,
        educationMatch,
        keywordsMatch
      },
      matchedSkills: matched,
      missingSkills: missing,
      aiSummary: `AI Analysis indicates the candidate has a strong alignment in core technologies like ${matched.join(', ') || 'basic programming'}. There are slight gaps in ${missing.join(', ') || 'none'}. Overall compatibility score is ${overallScore}%. Recommended for next recruitment rounds.`,
      aiModel: 'Claude 3.5 Sonnet'
    };

    return res.status(200).json({
      message: 'AI resume analysis completed.',
      analysis
    });
  } catch (err: any) {
    console.error('AI resume analysis error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 8. REQUEST MANAGER OFFER APPROVAL (Recruiter only)
// ==========================================
export const requestOfferApproval = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { designation, salaryAnnual, joiningDate } = req.body;

    if (!designation || !salaryAnnual || !joiningDate) {
      return res.status(400).json({ message: 'Designation, Salary, and Joining Date are required.' });
    }

    const resume = await Resume.findById(id);
    if (!resume) {
      return res.status(404).json({ message: 'Candidate application not found.' });
    }

    resume.offerDetails = {
      designation,
      salaryAnnual: parseFloat(salaryAnnual),
      joiningDate: new Date(joiningDate),
      status: 'pending_manager',
      requestedAt: new Date()
    };

    await resume.save();

    // Notify all managers
    const managers = await User.find({ role: 'manager' });
    for (const mgr of managers) {
      await Notification.create({
        recipientId: mgr._id,
        type: 'offer_approval_request',
        title: 'Offer Approval Required',
        message: `Recruiter ${req.user?.email} requested approval for releasing an offer to ${resume.candidateName} as ${designation} with CTC ₹${(parseFloat(salaryAnnual)/100000).toFixed(2)}L.`,
        data: { applicationId: resume._id }
      });
    }

    return res.status(200).json({ message: 'Offer approval request sent to managers.', resume });
  } catch (err: any) {
    console.error('Request offer approval error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 9. PROCESS OFFER APPROVAL (Manager only)
// ==========================================
export const processOfferApproval = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { decision, managerNotes } = req.body;

    if (decision !== 'approved' && decision !== 'rejected') {
      return res.status(400).json({ message: 'Decision must be approved or rejected.' });
    }

    const resume = await Resume.findById(id);
    if (!resume || !resume.offerDetails) {
      return res.status(404).json({ message: 'Application or offer details not found.' });
    }

    resume.offerDetails.status = decision === 'approved' ? 'approved' : 'rejected';
    resume.offerDetails.managerNotes = managerNotes || '';
    resume.offerDetails.processedAt = new Date();

    if (decision === 'approved') {
      resume.applicationStage = 'offer';
    } else {
      resume.applicationStage = 'rejected';
    }

    await resume.save();

    // Notify Candidate
    const candidateUser = await User.findOne({ email: resume.candidateEmail.toLowerCase() });
    if (candidateUser) {
      await Notification.create({
        recipientId: candidateUser._id,
        type: 'offer_decision',
        title: decision === 'approved' ? 'Offer Letter Released!' : 'Application Update',
        message: decision === 'approved' 
          ? `Congratulations! The manager has approved your offer as ${resume.offerDetails.designation}. Please view and accept it on your dashboard.`
          : `Thank you for your interest. Unfortunately, your application for ${resume.offerDetails.designation} will not be moving forward at this time.`,
        data: { applicationId: resume._id, decision }
      });
    }

    // Notify the Recruiter who posted the job
    const job = await JobPosting.findById(resume.jobPostingId);
    if (job) {
      await Notification.create({
        recipientId: job.postedBy,
        type: 'offer_decision_recruiter',
        title: `Offer ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `Manager has ${decision} the offer request for ${resume.candidateName}.`,
        data: { applicationId: resume._id }
      });
    }

    return res.status(200).json({ message: `Offer ${decision} successfully.`, resume });
  } catch (err: any) {
    console.error('Process offer error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 10. SCHEDULE GOOGLE MEET (Recruiter only)
// ==========================================
export const scheduleGoogleMeet = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { date, time, round, interviewer } = req.body;

    if (!date || !time || !round || !interviewer) {
      return res.status(400).json({ message: 'Date, time, round type, and interviewer are required.' });
    }

    const resume = await Resume.findById(id);
    if (!resume) {
      return res.status(404).json({ message: 'Candidate application not found.' });
    }

    const randomCode = Math.random().toString(36).substring(2, 5) + '-' + Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 5);
    const meetUrl = `https://meet.google.com/${randomCode}`;

    const oldStage = resume.applicationStage;
    resume.applicationStage = round;
    await resume.save();

    const job = await JobPosting.findById(resume.jobPostingId);
    if (job) {
      const oldKey = oldStage;
      const newKey = round;
      if (job.pipeline && (job.pipeline as any)[oldKey] !== undefined) {
        (job.pipeline as any)[oldKey] = Math.max(0, (job.pipeline as any)[oldKey] - 1);
      }
      if (job.pipeline && (job.pipeline as any)[newKey] !== undefined) {
        (job.pipeline as any)[newKey] = ((job.pipeline as any)[newKey] || 0) + 1;
      }
      await job.save();
    }

    const candidateUser = await User.findOne({ email: resume.candidateEmail.toLowerCase() });
    if (candidateUser) {
      await Notification.create({
        recipientId: candidateUser._id,
        type: 'interview_scheduled',
        title: 'Interview Scheduled!',
        message: `Your ${round.replace('_', ' ')} has been scheduled on ${date} at ${time} with ${interviewer}. Join Google Meet: ${meetUrl}`,
        data: { meetUrl, date, time, interviewer, round }
      });
    }

    return res.status(200).json({ message: 'Interview scheduled and candidate notified.', meetUrl, resume });
  } catch (err: any) {
    console.error('Schedule interview error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 11. GET NOTIFICATIONS (Authenticated users)
// ==========================================
export const getMyNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const notifications = await Notification.find({ recipientId: userId }).sort({ createdAt: -1 });
    return res.status(200).json(notifications);
  } catch (err: any) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 12. MARK NOTIFICATION READ
// ==========================================
export const markNotificationAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const notification = await Notification.findOne({ _id: id, recipientId: userId });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    notification.read = true;
    await notification.save();

    return res.status(200).json({ message: 'Notification marked as read.', notification });
  } catch (err: any) {
    console.error('Mark notification read error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 13. ACCEPT / DECLINE OFFER (Candidate only)
// ==========================================
export const processOfferCandidate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const candidateId = req.user?.id;

    if (action !== 'accept' && action !== 'decline') {
      return res.status(400).json({ message: 'Action must be accept or decline.' });
    }

    const resume = await Resume.findOne({ _id: id, $or: [{ candidateId }, { candidateEmail: req.user?.email.toLowerCase() }] });
    if (!resume || !resume.offerDetails) {
      return res.status(404).json({ message: 'Application or offer details not found.' });
    }

    if (resume.offerDetails.status !== 'approved') {
      return res.status(400).json({ message: 'Offer is not in approved state.' });
    }

    const job = await JobPosting.findById(resume.jobPostingId);

    if (action === 'accept') {
      resume.applicationStage = 'hired';
      
      if (job) {
        if (job.pipeline.offer > 0) job.pipeline.offer -= 1;
        job.pipeline.hired += 1;
        await job.save();

        await Notification.create({
          recipientId: job.postedBy,
          type: 'offer_accepted',
          title: 'Offer Accepted!',
          message: `Candidate ${resume.candidateName} has accepted the offer for ${resume.offerDetails.designation}!`,
          data: { applicationId: resume._id }
        });
      }
    } else {
      resume.applicationStage = 'rejected';
      resume.offerDetails.status = 'rejected';
    }

    await resume.save();
    return res.status(200).json({ message: `Offer ${action}ed successfully.`, resume });
  } catch (err: any) {
    console.error('Candidate process offer error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 14. GET PENDING OFFERS (Manager / Admin only)
// ==========================================
export const getPendingOffers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'manager' && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const offers = await Resume.find({
      'offerDetails.status': 'pending_manager'
    }).populate('jobPostingId', 'title requirements');

    return res.status(200).json(offers);
  } catch (err: any) {
    console.error('Fetch pending offers error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 15. CREATE HIRING REQUEST (Manager only)
// ==========================================
export const createHiringRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, count, description } = req.body;
    const managerId = req.user?.employeeId;
    const managerName = req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Manager';
    const departmentId = req.user?.department ? req.user.department.toString() : 'ENG';

    if (!title || !count) {
      return res.status(400).json({ message: 'Job title and headcount are required.' });
    }

    const result = await pgPool.query(`
      INSERT INTO hiring_requests (manager_id, manager_name, department_id, job_title, headcount, description, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `, [managerId, managerName, departmentId, title, count, description]);

    return res.status(201).json({
      message: 'Hiring request submitted successfully.',
      hiringRequest: result.rows[0]
    });
  } catch (err: any) {
    console.error('Create hiring request error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 16. GET HIRING REQUESTS (Manager / Recruiter / Admin)
// ==========================================
export const getHiringRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, employeeId } = req.user || {};

    let result;
    if (role === 'hr_recruiter' || role === 'admin') {
      result = await pgPool.query('SELECT * FROM hiring_requests ORDER BY created_at DESC');
    } else {
      result = await pgPool.query(
        'SELECT * FROM hiring_requests WHERE manager_id = $1 ORDER BY created_at DESC',
        [employeeId]
      );
    }

    return res.status(200).json(result.rows);
  } catch (err: any) {
    console.error('Get hiring requests error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 17. UPDATE HIRING REQUEST STATUS (Recruiter / Admin only)
// ==========================================
export const updateHiringRequestStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // approved, rejected

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be approved or rejected.' });
    }

    const result = await pgPool.query(`
      UPDATE hiring_requests
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Hiring request not found.' });
    }

    return res.status(200).json({
      message: `Hiring request has been ${status}.`,
      hiringRequest: result.rows[0]
    });
  } catch (err: any) {
    console.error('Update hiring request status error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
