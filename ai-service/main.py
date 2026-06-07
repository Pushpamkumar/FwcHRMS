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

  # Simple rule-based mock responses mimicking the HRBot intelligence
  user_name = payload.employeeContext.get("name", "Employee") if payload.employeeContext else "Employee"
  
  if "leave" in last_user_message:
    content = f"Hello {user_name}, you have 8 casual leaves, 4 sick leaves, and 12 earned leaves remaining for this calendar year. Would you like me to help you apply for leaves?"
    data = {"type": "leave_balance", "casual": 8, "sick": 4, "earned": 12}
  elif "pay" in last_user_message or "salary" in last_user_message:
    content = f"Your latest payslip for May 2026 was processed on May 31, 2026. The net payout was fully credited to your registered bank account. You can download the PDF in the Payslips section."
    data = {"type": "salary_status", "month": "May 2026", "status": "Paid"}
  elif "attendance" in last_user_message:
    content = f"Your average attendance rate is currently at 94.5%. You have clocked in late 3 times in the last 30 days. Let me know if you need to request regularization."
    data = {"type": "attendance_summary", "rate": 94.5}
  else:
    content = f"Hello {user_name}! I am HRBot, your personal FWC assistant. I can help you check your leave balance, view attendance, query salary slips, or explain company HR policy. What can I do for you today?"
    data = {"type": "general_help"}

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
