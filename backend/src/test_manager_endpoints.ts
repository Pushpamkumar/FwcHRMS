import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/v1';

async function testManager() {
  try {
    console.log('1. Attempting login as Rajiv Singh...');
    const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'rajiv.singh@fwcit.com',
      password: 'Password@2026'
    });

    console.log('Login Success!');
    const { accessToken } = loginRes.data;
    console.log('Access Token obtained:', accessToken.substring(0, 30) + '...');

    const headers = {
      Authorization: `Bearer ${accessToken}`
    };

    console.log('2. Requesting /employees...');
    const employeesRes = await axios.get(`${API_BASE_URL}/employees`, { headers });
    console.log('Success! Count of employees:', employeesRes.data?.employees?.length);

    console.log('3. Requesting /leaves/requests...');
    const leavesRes = await axios.get(`${API_BASE_URL}/leaves/requests`, { headers });
    console.log('Success! Count of leaves:', leavesRes.data?.length);

    console.log('4. Requesting /attendance/team...');
    const attendanceRes = await axios.get(`${API_BASE_URL}/attendance/team`, { headers });
    console.log('Success! Count of attendance records:', attendanceRes.data?.length);

  } catch (err: any) {
    console.error('Error occurred in test:');
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error('Data:', JSON.stringify(err.response.data));
    } else {
      console.error(err.message);
    }
  }
}

testManager();
