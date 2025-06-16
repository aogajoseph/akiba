import * as React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Wedding Planning',
    avatar: 'https://i.pravatar.cc/150?img=1',
    testimonial: 'Akiba made it so easy to save for our wedding. The group saving feature was a game-changer!',
  },
  {
    name: 'Michael Chen',
    role: 'Education Fund',
    avatar: 'https://i.pravatar.cc/150?img=2',
    testimonial: 'I\'ve been able to save for my children\'s education with the help of family and friends.',
  },
  {
    name: 'Emma Davis',
    role: 'Home Down Payment',
    avatar: 'https://i.pravatar.cc/150?img=3',
    testimonial: 'The progress tracking and milestone features kept me motivated throughout my saving journey.',
  },
];

export default function Testimonials() {
  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        bgcolor: 'grey.50',
      }}
    >
      <Container maxWidth="lg">
        <Box textAlign="center" mb={8}>
          <Typography variant="h3" fontWeight="bold" mb={2}>
            What Our Users Say
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Join thousands of satisfied users who have achieved their financial goals
          </Typography>
        </Box>
        <Grid container spacing={4}>
          {testimonials.map((testimonial, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar src={testimonial.avatar} sx={{ width: 56, height: 56, mr: 2 }} />
                    <Box>
                      <Typography variant="h6">{testimonial.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {testimonial.role}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body1">"{testimonial.testimonial}"</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
} 