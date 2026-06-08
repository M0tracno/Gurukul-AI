import React, {  useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Alert, Box, Card, CardContent, Grid, Paper, Tooltip, Typography } from '@mui/material';


const SystemAnalytics = () => {
  const [analytics, setAnalytics] = useState({
    userStats: [],
    performanceData: [],
    systemHealth: 'Good'
  });

  // Sample data for demo
  useEffect(() => {
    setAnalytics({
      userStats: [
        { name: 'Students', value: 450, color: '#8884d8' },
        { name: 'Faculty', value: 45, color: '#82ca9d' },
        { name: 'Parents', value: 320, color: '#ffc658' },
        { name: 'Admins', value: 5, color: '#ff7300' }
      ],
      performanceData: [
        { name: 'Jan', users: 400, active: 240 },
        { name: 'Feb', users: 450, active: 300 },
        { name: 'Mar', users: 500, active: 350 },
        { name: 'Apr', users: 520, active: 380 },
        { name: 'May', users: 580, active: 420 },
        { name: 'Jun', users: 620, active: 450 }
      ],
      systemHealth: 'Good'
    });
  }, []);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        System Analytics
      </Typography>

      <Grid container spacing={3}>
        {/* User Distribution */}
        <Grid size={{xs:12,md:6}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.userStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.userStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* User Growth */}
        <Grid size={{xs:12,md:6}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Growth Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="users" fill="#8884d8" name="Total Users" />
                  <Bar dataKey="active" fill="#82ca9d" name="Active Users" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* System Health */}
        <Grid size={{xs:12}}>
          <Alert severity="success">
            System Health: {analytics.systemHealth} - All services are running normally
          </Alert>
        </Grid>

        {/* Quick Stats */}
        <Grid size={{xs:12}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Statistics
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{xs:6,md:3}}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {analytics.userStats.reduce((sum, stat) => sum + stat.value, 0)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Users
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{xs:6,md:3}}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      95%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      System Uptime
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{xs:6,md:3}}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      2.3s
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg Response Time
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{xs:6,md:3}}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      12
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active Sessions
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemAnalytics;
