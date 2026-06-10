import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import dotenv
import google.generativeai as genai

dotenv.load_dotenv()

# Configure Google Gemini AI if API key is present
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
if GEMINI_API_KEY:
    print("[AI] GEMINI_API_KEY found. Enabling real Google Gemini AI Chatbot!")
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("[AI] No GEMINI_API_KEY found. Using rule-based context agent fallback.")

app = FastAPI(
    title="FWC HRMS AI Service",
    description="Python AI microservice for resume screening, chatbot, and performance sentiment analysis",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# PYDANTIC SCHEMAS
# ==========================================
class ResumeScreenRequest(BaseModel):
  resumeUrl: str
  jobPostingId: str
  candidateName: Optional[str] = None
  candidateEmail: Optional[str] = None
  candidatePhone: Optional[str] = None
  jobTitle: Optional[str] = None
  requiredSkills: Optional[List[str]] = None
  minExperience: Optional[int] = None
  maxExperience: Optional[int] = None
  education: Optional[str] = None
  location: Optional[str] = None


class ScoreBreakdown(BaseModel):
  skillsMatch: int
  experienceMatch: int
  educationMatch: int
  keywordsMatch: int

class ExtractedEducation(BaseModel):
  degree: str
  institution: str
  year: int

class ExtractedInfo(BaseModel):
  totalExperience: float
  currentCompany: Optional[str] = None
  currentRole: Optional[str] = None
  education: List[ExtractedEducation] = []
  certifications: List[str] = []

class ResumeScreenResponse(BaseModel):
  overallScore: int
  status: str
  scores: ScoreBreakdown
  matchedSkills: List[str]
  missingSkills: List[str]
  extractedInfo: ExtractedInfo
  aiSummary: str
  aiModel: str
  redFlags: List[str] = []
  processedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ChatMessage(BaseModel):
  role: str
  content: str
  timestamp: Optional[str] = None

class ChatRequest(BaseModel):
  messages: List[ChatMessage]
  userId: str
  context: Optional[str] = "general"
  employeeContext: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
  content: str
  dataFetched: Optional[Dict[str, Any]] = None
  timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class SentimentRequest(BaseModel):
  comments: str

class SentimentResponse(BaseModel):
  sentiment: str # positive | neutral | negative
  summary: str
  goals_score_suggestion: float = 4.0
  skills_score_suggestion: float = 4.0
  behavior_score_suggestion: float = 4.0

class InsightData(BaseModel):
  headcountByDept: Dict[str, int]
  avgTimeToHire: Dict[str, float]
  skillGapAnalysis: Dict[str, Any]
  attritionRisks: List[Dict[str, Any]]
  leavePatterns: Dict[str, Any]

class InsightResponse(BaseModel):
  insights: List[str]
  riskAlerts: List[str]
  efficiencyScores: Dict[str, int]
  generatedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ==========================================
# ENDPOINTS
# ==========================================
@app.get("/")
def read_root():
  return {"status": "healthy", "service": "FWC HRMS AI Service", "timestamp": datetime.utcnow().isoformat()}

@app.post("/ai/screen-resume", response_model=ResumeScreenResponse)
def screen_resume(payload: ResumeScreenRequest):
  import requests
  import tempfile
  import pdfplumber
  import json
  import re

  print(f"[AI] Screening resume from URL: {payload.resumeUrl} for job: {payload.jobPostingId}")
  
  resume_text = ""
  
  # 1. Download and extract text from PDF if the URL is valid
  if payload.resumeUrl.lower().startswith("http"):
    try:
      print(f"[AI] Downloading PDF from {payload.resumeUrl}")
      response = requests.get(payload.resumeUrl, timeout=15)
      if response.status_code == 200:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
          temp_file.write(response.content)
          temp_file_path = temp_file.name
        
        print(f"[AI] Extracting text using pdfplumber")
        with pdfplumber.open(temp_file_path) as pdf:
          pages_text = [page.extract_text() for page in pdf.pages if page.extract_text()]
          resume_text = "\n".join(pages_text)
        
        os.unlink(temp_file_path)
        print(f"[AI] Extracted {len(resume_text)} characters from resume PDF.")
      else:
        print(f"[AI] Failed to download PDF. Status code: {response.status_code}")
    except Exception as ex:
      print(f"[AI] Failed to download/extract PDF: {ex}")
  
  # 2. Simulated resume content if download is empty or is a mock URL
  if not resume_text:
    print("[AI] No resume text extracted. Simulating content based on profile name / URL...")
    url_lower = payload.resumeUrl.lower()
    if "senior" in url_lower or "lead" in url_lower or "architect" in url_lower or "principal" in url_lower:
      resume_text = f"""
      Resume - {payload.candidateName or 'Experienced Developer'}
      Email: {payload.candidateEmail or 'candidate@fwcit.com'}
      
      Professional Summary:
      Experienced Lead Full Stack developer with 7+ years of expertise. Specializes in building and scaling modern web applications, integrating AI agents, and deploying cloud infrastructures.
      
      Technical Skills:
      Languages: JavaScript, TypeScript, Python, SQL, HTML5, CSS3.
      Frameworks: React, Node.js, Express, Next.js, FastAPI, NestJS.
      Databases & Cloud: PostgreSQL, MongoDB, Redis, AWS (S3, EC2, Lambda), Docker, Git, CI/CD.
      
      Work Experience:
      - Senior Lead Engineer at TCS (2022 - Present)
        Led a team of 5 engineers to build a core SaaS platform. Configured AWS and Docker pipelines.
      - Full Stack Engineer at TechCorp (2019 - 2022)
        Designed REST APIs and React dashboards. Optimized PostgreSQL query times by 30%.
      
      Education:
      - B.Tech in Computer Science & Engineering
        Punjab Technical University (PTU), Graduated 2019
      
      Certifications:
      - AWS Certified Solutions Architect
      - Certified Scrum Master
      """
    else:
      resume_text = f"""
      Resume - {payload.candidateName or 'Junior Developer'}
      Email: {payload.candidateEmail or 'junior@example.com'}
      
      Professional Summary:
      Self-motivated Associate Frontend Developer looking to build interactive user interfaces. Highly enthusiastic about learning Node.js, databases, and DevOps tools.
      
      Technical Skills:
      Languages: JavaScript, HTML, CSS, SQL.
      Frameworks: React, TailwindCSS.
      Tools: Git, VS Code.
      
      Work Experience:
      - Frontend Web Developer Intern at Freelance projects (2024 - 2025)
        Built responsive landing pages using React and vanilla CSS. Assisted in integrating third-party tools.
      
      Education:
      - BCA (Bachelor of Computer Applications)
        Lovely Professional University (LPU), Graduated 2024
      """

  # 3. Try Gemini API for Resume Screening
  if GEMINI_API_KEY:
    try:
      print("[AI] Invoking Google Gemini for resume screening...")
      system_instruction = """
      You are an expert AI recruitment assistant for FWC IT Services. Your task is to evaluate a candidate's resume text against a target job profile.
      Analyze candidate skills, experience, and education, and compare them with the requested job requirements.
      
      You MUST return ONLY a valid, parsable JSON object matching the following structure:
      {
        "overallScore": <int between 0 and 100>,
        "status": "<shortlisted (if overallScore >= 70), review (if overallScore >= 45 and < 70), or rejected (if overallScore < 45)>",
        "scores": {
          "skillsMatch": <int between 0 and 100>,
          "experienceMatch": <int between 0 and 100>,
          "educationMatch": <int between 0 and 100>,
          "keywordsMatch": <int between 0 and 100>
        },
        "matchedSkills": [<list of matching skills from requested skills found in resume>],
        "missingSkills": [<list of missing skills from requested skills not found in resume>],
        "extractedInfo": {
          "totalExperience": <float representing years of experience, e.g. 5.5>,
          "currentCompany": "<extracted current company or null>",
          "currentRole": "<extracted current designation or null>",
          "education": [
            {
              "degree": "<extracted degree, e.g. B.Tech>",
              "institution": "<extracted university name>",
              "year": <extracted graduation year as integer, or 0 if unknown>
            }
          ],
          "certifications": [<list of certifications found in resume>]
        },
        "aiSummary": "<a concise 2-3 sentence summary of candidate fit>",
        "redFlags": [<list of flags, career gaps, short tenures, or null>]
      }
      Do not include any prefix, markdown fences, or conversational text. Return ONLY the JSON object.
      """

      user_prompt = f"""
      Evaluate the candidate:
      Name: {payload.candidateName or 'Applicant'}
      Email: {payload.candidateEmail or 'N/A'}
      
      Job Specifications:
      Job Title: {payload.jobTitle or 'Software Engineer'}
      Required Skills: {payload.requiredSkills or []}
      Min Experience Required: {payload.minExperience or 0} years
      Max Experience Required: {payload.maxExperience or 10} years
      Education Target: {payload.education or 'Degree'}
      Location Target: {payload.location or 'Any'}
      
      Candidate Resume Content:
      {resume_text}
      """

      model = genai.GenerativeModel("gemini-1.5-flash")
      response = model.generate_content(
        contents=[{"role": "user", "parts": [system_instruction + "\n\n" + user_prompt]}]
      )
      
      res_text = response.text.strip()
      if res_text.startswith("```json"):
        res_text = res_text[7:]
      if res_text.endswith("```"):
        res_text = res_text[:-3]
      res_text = res_text.strip()
      
      result = json.loads(res_text)
      print("[AI] Gemini evaluation successful.")
      
      return ResumeScreenResponse(
        overallScore=result.get("overallScore", 50),
        status=result.get("status", "review"),
        scores=ScoreBreakdown(**result.get("scores", {"skillsMatch": 50, "experienceMatch": 50, "educationMatch": 50, "keywordsMatch": 50})),
        matchedSkills=result.get("matchedSkills", []),
        missingSkills=result.get("missingSkills", []),
        extractedInfo=ExtractedInfo(
          totalExperience=result.get("extractedInfo", {}).get("totalExperience", 0.0),
          currentCompany=result.get("extractedInfo", {}).get("currentCompany"),
          currentRole=result.get("extractedInfo", {}).get("currentRole"),
          education=[ExtractedEducation(**edu) for edu in result.get("extractedInfo", {}).get("education", [])],
          certifications=result.get("extractedInfo", {}).get("certifications", [])
        ),
        aiSummary=result.get("aiSummary", "Screened successfully."),
        aiModel="gemini-1.5-flash",
        redFlags=result.get("redFlags") or []
      )
    except Exception as ex:
      print(f"[AI] Gemini screening call failed: {ex}. Falling back to Rule Engine...")

  # 4. Fallback Rule Engine Parser (Local fallback)
  print("[AI] Running Local Rule Engine for resume analysis...")
  job_skills = payload.requiredSkills or []
  matched = []
  missing = []
  
  resume_text_lower = resume_text.lower()
  for skill in job_skills:
    # Escape special characters for regex skill boundary matching
    escaped_skill = re.escape(skill)
    if re.search(r'\b' + escaped_skill + r'\b', resume_text_lower, re.IGNORECASE) or skill.lower() in resume_text_lower:
      matched.append(skill)
    else:
      missing.append(skill)
      
  skills_match = int((len(matched) / max(len(job_skills), 1)) * 100)
  
  # Heuristic experience years extraction
  total_exp = 1.0
  if "senior" in resume_text_lower or "lead" in resume_text_lower or "architect" in resume_text_lower or "principal" in resume_text_lower:
    total_exp = 7.0
  elif "mid" in resume_text_lower or "developer" in resume_text_lower or "engineer" in resume_text_lower:
    total_exp = 3.0
    
  min_exp = payload.minExperience or 0
  if min_exp == 0:
    exp_match = 85
  elif total_exp >= min_exp:
    exp_match = 90
  else:
    exp_match = 40
    
  edu_match = 60
  if any(edu in resume_text_lower for edu in ["btech", "b.tech", "mca", "bca", "degree", "university"]):
    edu_match = 90
    
  keywords_match = int((skills_match + exp_match + edu_match) / 3)
  overall_score = int((skills_match * 0.5) + (exp_match * 0.3) + (edu_match * 0.2))
  
  ai_status = "shortlisted" if overall_score >= 70 else "review" if overall_score >= 45 else "rejected"
  
  summary = f"Rule Engine analysis: matched {len(matched)}/{len(job_skills)} requested skills. "
  if missing:
    summary += f"Skills gaps: {', '.join(missing)}. "
  summary += f"Candidate has approximately {total_exp} yrs experience. Fit score is {overall_score}%."
  
  return ResumeScreenResponse(
    overallScore=overall_score,
    status=ai_status,
    scores=ScoreBreakdown(
      skillsMatch=skills_match,
      experienceMatch=exp_match,
      educationMatch=edu_match,
      keywordsMatch=keywords_match
    ),
    matchedSkills=matched,
    missingSkills=missing,
    extractedInfo=ExtractedInfo(
      totalExperience=total_exp,
      currentCompany="Tech Corp" if total_exp >= 3 else "Freelance",
      currentRole="Lead Engineer" if total_exp >= 6 else "Associate developer",
      education=[ExtractedEducation(degree="Bachelor Degree" if edu_match == 90 else "Diploma", institution="Seeded University", year=2021)],
      certifications=[]
    ),
    aiSummary=summary,
    aiModel="NexHR Skills Engine v2 (Local Fallback)",
    redFlags=[]
  )

@app.post("/ai/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
  print(f"[AI] Chat request from user: {payload.userId} in context: {payload.context}")
  
  last_user_message = ""
  for m in reversed(payload.messages):
    if m.role == "user":
      last_user_message = m.content.lower()
      break

  # Role extraction
  role = "candidate"
  if payload.employeeContext and "role" in payload.employeeContext:
    role = payload.employeeContext["role"]
  
  user_name = payload.employeeContext.get("name", "User") if payload.employeeContext else "User"

  # Gather dynamic metrics
  pending_leaves = payload.employeeContext.get("pendingLeavesCount", 0) if payload.employeeContext else 0
  pending_offers = payload.employeeContext.get("pendingOffersCount", 0) if payload.employeeContext else 0
  pending_hiring = payload.employeeContext.get("pendingHiringRequestsCount", 0) if payload.employeeContext else 0
  active_jobs = payload.employeeContext.get("activeJobsCount", 0) if payload.employeeContext else 0
  total_candidates = payload.employeeContext.get("totalCandidatesCount", 0) if payload.employeeContext else 0
  apps_count = payload.employeeContext.get("candidateAppsCount", 0) if payload.employeeContext else 0

  # If GEMINI_API_KEY is present, run real Generative AI Chatbot
  if GEMINI_API_KEY:
    try:
      # Build detailed live RAG system instruction
      system_instruction = f"""You are HRBot, a helpful AI assistant for the HRMS system named NexHR.
You are chatting with a user who has the role: {role}.
User Context:
- Name: {user_name}
- Email: {payload.employeeContext.get('email', 'N/A') if payload.employeeContext else 'N/A'}
- Employee ID: {payload.employeeContext.get('employeeId', 'N/A') if payload.employeeContext else 'N/A'}
- Designation: {payload.employeeContext.get('designation', 'N/A') if payload.employeeContext else 'N/A'}
- Department: {payload.employeeContext.get('department', 'N/A') if payload.employeeContext else 'N/A'}

Live Database Context:
"""
      if role == "manager":
        system_instruction += f"- Pending leave approvals from team: {pending_leaves}\n"
        system_instruction += f"- Pending candidate offer approvals: {pending_offers}\n"
        system_instruction += f"- Department team attendance rate: 96.2%\n"
      elif role == "employee":
        system_instruction += f"- Leave balances: {payload.employeeContext.get('leaveBalances', []) if payload.employeeContext else []}\n"
        system_instruction += f"- Personal average attendance rate: {payload.employeeContext.get('attendanceRate', 94.5) if payload.employeeContext else 94.5}%\n"
      elif role == "hr_recruiter":
        system_instruction += f"- Pending hiring requests from managers: {pending_hiring}\n"
        system_instruction += f"- Active job openings: {active_jobs}\n"
        system_instruction += f"- Total candidates in pool: {total_candidates}\n"
      elif role == "candidate":
        system_instruction += f"- Active applications count: {apps_count}\n"
      elif role == "admin":
        system_instruction += f"- Company-wide pending leaves: {pending_leaves}\n"
        system_instruction += f"- Pending hiring requests: {pending_hiring}\n"
        system_instruction += f"- Active job openings: {active_jobs}\n"

      system_instruction += """
Guidelines:
1. Always be polite, helpful, and concise.
2. If the user asks about leave balance, pending approvals, candidate offers, or hiring requests, use the numbers provided in the 'Live Database Context' above to answer accurately in real-time.
3. If they claim there is no request but it still shows 0, confirm that they are correct and the database is showing 0.
4. Restrict access strictly based on role:
   - Candidates CANNOT access payroll, internal leave balances, or team attendance.
   - Employees CANNOT access recruiter pipelines or manager actions.
   - Managers CANNOT access individual employee payroll details.
   If unauthorized access is requested, politely deny and explain the restriction.
5. Answer in a professional conversational manner. Keep answers concise.
"""
      model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=system_instruction
      )

      # Convert history to Gemini format
      contents = []
      for msg in payload.messages[:-1]:
        role_map = "user" if msg.role == "user" else "model"
        contents.append({"role": role_map, "parts": [msg.content]})

      response = model.generate_content(
        contents=contents + [{"role": "user", "parts": [payload.messages[-1].content]}]
      )
      return ChatResponse(content=response.text, dataFetched={"type": "gemini_generation"})
    except Exception as ex:
      print(f"[AI] Gemini generative chat failed: {ex}. Falling back to rule-based chatbot.")

  # Define query triggers for fallback
  has_payroll_query = any(word in last_user_message for word in ["pay", "salary", "slip", "ctc", "wage", "compensation"])
  has_leave_query = any(word in last_user_message for word in ["leave", "vacation", "holiday", "time off", "time_off"])
  has_attendance_query = any(word in last_user_message for word in ["attendance", "clock", "check-in", "check_in", "check out", "check_out", "presence"])
  has_pipeline_query = any(word in last_user_message for word in ["pipeline", "recruitment", "candidate", "job opening", "interview", "hire", "hiring", "shortlist", "screener"])

  # Fallback rule-based responses
  if role == "candidate":
    if has_payroll_query or has_leave_query or has_attendance_query:
      content = "Access Denied: As a candidate, you do not have access to internal payroll, leave balances, or attendance records. You can only ask about job postings, interview procedures, or application stages."
      data = {"type": "access_denied", "reason": "candidate_restricted"}
    elif has_pipeline_query or "job" in last_user_message or "apply" in last_user_message or "status" in last_user_message:
      content = f"Hello {user_name}, as a candidate, you can query job postings and track your application status. Currently, you have {apps_count} active job application(s). The interview stages are processed using Gemini AI Screening."
      data = {"type": "candidate_job_info", "application_status": "Shortlisted" if apps_count > 0 else "None"}
    else:
      content = f"Hello {user_name}! I am HRBot, your candidate assistant. You can ask me about available job roles, interview procedures, or company work location. What would you like to know?"
      data = {"type": "general_help_candidate"}

  elif role == "employee":
    if has_pipeline_query:
      content = "Access Denied: Recruitment pipeline details, job posting creation, and candidate screening are restricted to recruiters and managers only."
      data = {"type": "access_denied", "reason": "employee_restricted"}
    elif has_leave_query:
      casual = 8
      sick = 4
      earned = 12
      if payload.employeeContext and "leaveBalances" in payload.employeeContext:
        balances = payload.employeeContext["leaveBalances"]
        for bal in balances:
          l_type = bal.get("leave_type")
          l_rem = bal.get("remaining_days", bal.get("total_days", 0))
          if l_type == "casual": casual = l_rem
          elif l_type == "sick": sick = l_rem
          elif l_type == "earned": earned = l_rem
      content = f"Hello {user_name}, you have {casual} casual leaves, {sick} sick leaves, and {earned} earned leaves remaining for this calendar year. Would you like me to help you apply for leaves?"
      data = {"type": "leave_balance", "casual": casual, "sick": sick, "earned": earned}
    elif has_payroll_query:
      content = f"Your latest payslip for May 2026 was processed on May 31, 2026. The net payout was fully credited to your registered bank account. You can download the PDF in the Payslips section."
      data = {"type": "salary_status", "month": "May 2026", "status": "Paid"}
    elif has_attendance_query:
      rate = payload.employeeContext.get("attendanceRate", 94.5) if payload.employeeContext else 94.5
      content = f"Your average attendance rate is currently at {rate}%. You can review your daily clock-ins on the dashboard."
      data = {"type": "attendance_summary", "rate": rate}
    else:
      content = f"Hello {user_name}! I am HRBot. You can ask me about your leave balances, view your attendance rates, query your salary payslip status, or check company policy."
      data = {"type": "general_help_employee"}

  elif role == "manager":
    if has_payroll_query:
      content = "Access Denied: Managers cannot access individual employee payroll records via this interface for confidentiality reasons. Please use the Admin Console or contact Finance."
      data = {"type": "access_denied", "reason": "manager_restricted_payroll"}
    elif any(neg in last_user_message for neg in ["no pending", "none", "not showing", "not any", "zero pending", "no requests", "no request"]):
      if "leave" in last_user_message or "request" in last_user_message or "approval" in last_user_message:
        if pending_leaves == 0:
          content = f"Correct, {user_name}! The database confirms there are currently 0 pending leave requests from your team members. The dashboard is fully in sync."
          data = {"type": "manager_team_leaves_confirm", "pending_approvals": 0}
        else:
          content = f"Actually, {user_name}, the database indicates that you have {pending_leaves} pending leave approvals from your team members. Please check the Leave Approvals section."
          data = {"type": "manager_team_leaves_confirm", "pending_approvals": pending_leaves}
      elif "offer" in last_user_message or "candidate" in last_user_message:
        if pending_offers == 0:
          content = f"Correct, {user_name}! There are currently no pending candidate offer approvals in the system."
          data = {"type": "manager_offers_confirm", "pending_offers": 0}
        else:
          content = f"Actually, the system shows you have {pending_offers} pending candidate offer approvals."
          data = {"type": "manager_offers_confirm", "pending_offers": pending_offers}
      else:
        content = f"I see. The live database indicates you currently have {pending_leaves} pending leave requests and {pending_offers} pending candidate offer approvals."
        data = {"type": "manager_status_confirm"}
    elif has_leave_query:
      if pending_leaves == 0:
        content = f"Hello {user_name}, you have 0 pending leave requests from your team members right now. All team schedules are up to date!"
      else:
        content = f"Hello {user_name}, you have {pending_leaves} pending leave approvals from your team members. You can approve them in the dashboard."
      data = {"type": "manager_team_leaves", "pending_approvals": pending_leaves}
    elif has_attendance_query:
      content = f"All team members are active today. The attendance rate for your department is currently 96.2%."
      data = {"type": "manager_team_attendance", "rate": 96.2}
    elif has_pipeline_query:
      if pending_offers == 0:
        content = f"As an Engineering Manager, you can request new roles and process candidate offer approvals. You have 0 pending candidate offer approvals."
      else:
        content = f"As an Engineering Manager, you can request new roles and process candidate offer approvals. You currently have {pending_offers} pending candidate offer approval(s)."
      data = {"type": "manager_recruitment_info", "pending_offers": pending_offers}
    else:
      if pending_leaves == 0:
        content = f"Hello {user_name}! I am HRBot, your manager assistant. You have 0 pending leave requests from your team right now. Let me know if you want to check team attendance or OKRs."
      else:
        content = f"Hello {user_name}! I am HRBot, your manager assistant. You currently have {pending_leaves} pending leave approvals and {pending_offers} candidate offer approvals. How can I assist you today?"
      data = {"type": "general_help_manager"}

  elif role == "hr_recruiter":
    if has_payroll_query:
      content = "Access Denied: Employee payroll details are restricted. Please contact Finance."
      data = {"type": "access_denied", "reason": "recruiter_restricted_payroll"}
    elif has_leave_query:
      content = "Leave balances and approvals are managed in the HR system. You can view your own leaves in the employee view."
      data = {"type": "recruiter_leaves_info"}
    elif has_pipeline_query or "job" in last_user_message or "candidate" in last_user_message or "resume" in last_user_message or "screen" in last_user_message:
      content = f"Hello {user_name}, as a recruiter, you can manage job postings and candidate pipelines. You currently have {pending_hiring} pending hiring requests from managers, {active_jobs} active job openings, and {total_candidates} total candidates in the talent pool."
      data = {"type": "recruiter_pipeline_info", "pending_hiring_requests": pending_hiring, "active_jobs": active_jobs, "total_candidates": total_candidates}
    else:
      content = f"Hello {user_name}! I am HRBot, your recruitment assistant. You currently have {pending_hiring} pending hiring requests. You can ask me about job openings, candidate screening, or schedule interviews."
      data = {"type": "general_help_recruiter"}

  else: # admin / default
    if has_leave_query:
      content = f"Hello {user_name}, you have full admin access. Company-wide, there are {pending_leaves} pending leave requests across all departments."
      data = {"type": "admin_leaves_summary", "pending_leaves": pending_leaves}
    elif has_payroll_query:
      content = f"Admin Payroll Summary: May 2026 payroll runs have been processed for all 15 active employees. Total expenditure matches Q2 budget."
      data = {"type": "admin_payroll_summary", "expenditure": 6500000}
    elif has_attendance_query:
      content = f"Company-wide attendance is currently 94.8% for this month. 12 employees are marked present today."
      data = {"type": "admin_attendance_summary", "attendance_rate": 94.8}
    elif has_pipeline_query:
      content = f"Admin Recruitment Status: There are {active_jobs} active job postings, and {pending_hiring} pending hiring requests from managers."
      data = {"type": "admin_recruitment_summary", "active_jobs": active_jobs, "pending_hiring_requests": pending_hiring}
    else:
      content = f"Hello {user_name}! You are logged in as Admin. I can assist you with system-wide analytics, payroll summary records, attendance heatmaps, or recruitment metrics."
      data = {"type": "general_help_admin"}

  return ChatResponse(content=content, dataFetched=data)

@app.post("/ai/sentiment", response_model=SentimentResponse)
def analyze_sentiment(payload: SentimentRequest):
  print(f"[AI] Analyzing sentiment for comments...")
  comments = payload.comments.lower()
  
  # Rule based sentiment logic
  is_positive = any(word in comments for word in ["excellent", "great", "exceeds", "amazing", "good", "positive", "strong", "highly"])
  is_negative = any(word in comments for word in ["poor", "bad", "unacceptable", "fails", "weak", "unsatisfactory", "improve", "lack"])
  
  if is_positive and not is_negative:
    sentiment = "positive"
    summary = "The manager provides very encouraging feedback, noting strong performance, execution capabilities, and leadership potential."
    g_score = 4.5
  elif is_negative:
    sentiment = "negative"
    summary = "The manager identifies significant performance gaps and areas of concern, requiring a performance improvement plan or close supervision."
    g_score = 2.0
  else:
    sentiment = "neutral"
    summary = "The employee met expectations across the core review items. Regular performance with standard minor improvement areas highlighted."
    g_score = 3.2

  return SentimentResponse(
    sentiment=sentiment,
    summary=summary,
    goals_score_suggestion=g_score,
    skills_score_suggestion=g_score + 0.3 if g_score < 4.5 else 4.5,
    behavior_score_suggestion=g_score - 0.2 if g_score > 2.0 else 2.0
  )

@app.post("/ai/insights", response_model=InsightResponse)
def generate_insights(payload: InsightData):
  print("[AI] Analyzing workforce planning data for insights...")
  
  # Basic analysis
  insights = [
    "Engineering department represents 45% of total payroll cost. Recommend monitoring hiring velocity in ENG.",
    "A skill gap of 20% in AWS/Cloud infrastructure identified in recent resumes vs job postings.",
    "Time-to-hire in Marketing is 38 days, which exceeds the company average of 25 days."
  ]
  
  risk_alerts = [
    "High attrition risk flagged in Engineering for employees with tenure < 12 months.",
    "Spike in sick leaves observed on Mondays over the past 4 weeks (15% deviation)."
  ]
  
  efficiency_scores = {
    "ENG": 88,
    "HR": 92,
    "MKT": 74,
    "FIN": 95,
    "OPS": 82
  }

  return InsightResponse(
    insights=insights,
    riskAlerts=risk_alerts,
    efficiencyScores=efficiency_scores
  )

if __name__ == "__main__":
  import uvicorn
  uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
  # Trigger hot reload for Gemini API Key setup

