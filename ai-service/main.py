import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import dotenv

dotenv.load_dotenv()

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
  requirements: Optional[Dict[str, Any]] = None

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
  # Mock screening logic
  print(f"[AI] Screening resume from URL: {payload.resumeUrl} for job: {payload.jobPostingId}")
  
  # Return dynamic mock results based on URL content (e.g. for testing)
  is_qualified = "senior" in payload.resumeUrl.lower() or "lead" in payload.resumeUrl.lower()
  
  if is_qualified:
    return ResumeScreenResponse(
      overallScore=88,
      status="shortlisted",
      scores=ScoreBreakdown(skillsMatch=90, experienceMatch=85, educationMatch=80, keywordsMatch=95),
      matchedSkills=["React", "Node.js", "TypeScript", "AWS", "Git"],
      missingSkills=["Docker", "Kubernetes"],
      extractedInfo=ExtractedInfo(
        totalExperience=5.5,
        currentCompany="TCS",
        currentRole="Senior Developer",
        education=[ExtractedEducation(degree="B.Tech CSE", institution="PTU", year=2020)],
        certifications=["AWS Cloud Practitioner"]
      ),
      aiSummary="Strong candidate with extensive React and Node.js experience. Solid architectural understanding.",
      aiModel="claude-3-5-sonnet-20241022",
      redFlags=[]
    )
  else:
    return ResumeScreenResponse(
      overallScore=62,
      status="review",
      scores=ScoreBreakdown(skillsMatch=65, experienceMatch=60, educationMatch=70, keywordsMatch=55),
      matchedSkills=["React", "HTML", "CSS", "JavaScript"],
      missingSkills=["Node.js", "TypeScript", "SQL"],
      extractedInfo=ExtractedInfo(
        totalExperience=1.5,
        currentCompany="Freelance",
        currentRole="Frontend Intern",
        education=[ExtractedEducation(degree="B.Sc IT", institution="LPU", year=2024)],
        certifications=[]
      ),
      aiSummary="Junior developer with basic React experience. Lacks backend knowledge and deep enterprise coding experience.",
      aiModel="claude-3-5-sonnet-20241022",
      redFlags=["Very short tenure at previous freelance projects"]
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

  # Define unauthorized triggers
  has_payroll_query = any(word in last_user_message for word in ["pay", "salary", "slip", "ctc", "wage", "compensation"])
  has_leave_query = any(word in last_user_message for word in ["leave", "vacation", "holiday", "time off", "time_off"])
  has_attendance_query = any(word in last_user_message for word in ["attendance", "clock", "check-in", "check_in", "check out", "check_out", "presence"])
  has_pipeline_query = any(word in last_user_message for word in ["pipeline", "recruitment", "candidate", "job opening", "interview", "hire", "hiring", "shortlist", "screener"])

  # Restricting responses based on role
  if role == "candidate":
    if has_payroll_query or has_leave_query or has_attendance_query:
      content = "Access Denied: As a candidate, you do not have access to internal payroll, leave balances, or attendance records. You can only ask about job postings, interview procedures, or application stages."
      data = {"type": "access_denied", "reason": "candidate_restricted"}
    elif has_pipeline_query or "job" in last_user_message or "apply" in last_user_message or "status" in last_user_message:
      content = f"Hello {user_name}, as a candidate, you can query job postings and track your application status. Currently, you have 1 active job application. The interview stages are processed using Gemini AI Screening."
      data = {"type": "candidate_job_info", "application_status": "Shortlisted"}
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
    elif has_leave_query:
      content = f"Hello {user_name}, you have 3 pending leave approvals from your team members. You can approve them in the dashboard."
      data = {"type": "manager_team_leaves", "pending_approvals": 3}
    elif has_attendance_query:
      content = f"All team members are active today. The attendance rate for your department is currently 96.2%."
      data = {"type": "manager_team_attendance", "rate": 96.2}
    elif has_pipeline_query:
      content = f"As an Engineering Manager, you can request new roles and process candidate offer approvals. You currently have 1 pending candidate offer approval."
      data = {"type": "manager_recruitment_info", "pending_offers": 1}
    else:
      content = f"Hello {user_name}! I am HRBot, your manager assistant. You can ask me about team attendance rates, pending leave approvals, OKR goal status, or candidate offer approvals."
      data = {"type": "general_help_manager"}

  elif role == "hr_recruiter":
    if has_payroll_query:
      content = "Access Denied: Employee payroll details are restricted. Please contact Finance."
      data = {"type": "access_denied", "reason": "recruiter_restricted_payroll"}
    elif has_leave_query:
      content = "Leave balances and approvals are managed in the HR system. You can view your own leaves in the employee view."
      data = {"type": "recruiter_leaves_info"}
    elif has_pipeline_query or "job" in last_user_message or "candidate" in last_user_message or "resume" in last_user_message or "screen" in last_user_message:
      content = f"Hello {user_name}, as a recruiter, you can manage job postings and candidate pipelines. You currently have 4 pending hiring requests from managers."
      data = {"type": "recruiter_pipeline_info", "pending_hiring_requests": 4}
    else:
      content = f"Hello {user_name}! I am HRBot, your recruitment assistant. You can ask me about job openings, candidate screening, resume score distributions, or schedule interviews."
      data = {"type": "general_help_recruiter"}

  else: # admin / default
    if has_leave_query:
      content = f"Hello {user_name}, you have full admin access. Company-wide, there are 7 pending leave requests across all departments."
      data = {"type": "admin_leaves_summary", "pending_leaves": 7}
    elif has_payroll_query:
      content = f"Admin Payroll Summary: May 2026 payroll runs have been processed for all 15 active employees. Total expenditure matches Q2 budget."
      data = {"type": "admin_payroll_summary", "expenditure": 6500000}
    elif has_attendance_query:
      content = f"Company-wide attendance is currently 94.8% for this month. 12 employees are marked present today."
      data = {"type": "admin_attendance_summary", "attendance_rate": 94.8}
    elif has_pipeline_query:
      content = f"Admin Recruitment Status: There are 2 active job postings, 14 total candidate applications, and 4 pending hiring requests."
      data = {"type": "admin_recruitment_summary", "active_jobs": 2, "total_applications": 14}
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
