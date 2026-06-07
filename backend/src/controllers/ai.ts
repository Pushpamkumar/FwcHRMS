import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { User, Department } from '../models';
import { pgPool } from '../config/db';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

export const chatWithBot = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messages, context } = req.body;
    const userId = req.user?.id;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'messages list is required.' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    // 1. Gather Employee context details for AI prompt formatting (RAG Context)
    const user = await User.findById(userId).populate('department');
    let employeeContext: Record<string, any> = {};

    if (user) {
      employeeContext = {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        employeeId: user.employeeId,
        role: user.role,
        designation: user.employmentDetails?.designation || 'Staff',
        department: (user.department as any)?.name || 'Unassigned',
      };

      try {
        // Fetch Postgres leave balances
        const leaveRes = await pgPool.query(
          'SELECT leave_type, remaining_days FROM leave_balances WHERE employee_id = $1 AND year = $2',
          [user.employeeId, new Date().getFullYear()]
        );
        employeeContext.leaveBalances = leaveRes.rows;

        // Fetch Postgres average attendance rates
        const attendanceRes = await pgPool.query(`
          SELECT 
            COUNT(CASE WHEN status IN ('present', 'work_from_home', 'late') THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 as rate
          FROM attendance WHERE employee_id = $1
        `, [user.employeeId]);
        
        employeeContext.attendanceRate = attendanceRes.rows[0]?.rate 
          ? parseFloat(parseFloat(attendanceRes.rows[0].rate).toFixed(1)) 
          : 100.0;
      } catch (dbErr) {
        console.warn('[AI Controller] Failed to fetch PG database context for chatbot:', dbErr);
      }
    }

    // 2. Call FastAPI Python AI microservice Chat endpoint
    console.log(`[AI Chat] Proxying chatbot query to Python FastAPI at ${AI_SERVICE_URL}/ai/chat...`);
    const aiRes = await fetch(`${AI_SERVICE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
        userId,
        context: context || 'general',
        employeeContext
      })
    });

    if (!aiRes.ok) {
      throw new Error(`AI service responded with status ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    return res.status(200).json(aiData);
  } catch (err: any) {
    console.error('[AI Chat] Chatbot backend proxy failed:', err.message);
    // Provide nice fallback if Python AI service is down
    return res.status(200).json({
      content: "Hello! I am HRBot. My Python AI microservice is currently running, but I failed to communicate. Please make sure the fastapi service on port 8000 is loaded.",
      dataFetched: { type: 'fallback' },
      timestamp: new Date().toISOString()
    });
  }
};
