import * as React from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import { useMaterialUIController } from 'context';
import testimonial1 from 'assets/images/testimonial-1.png';
import testimonial2 from 'assets/images/testimonial-2.png';
import testimonial3 from 'assets/images/testimonial-3.png';
import testimonial4 from 'assets/images/testimonial-4.png';
import testimonial5 from 'assets/images/testimonial-5.png';
import testimonial6 from 'assets/images/testimonial-6.png';

const userTestimonials = [
  {
    avatar: testimonial1,
    name: 'Mary Wambui',
    occupation: 'Chama Treasurer, Nairobi',
    testimonial:
      '“Akiba has completely changed how our local chama manages funds. Everything happens online and we no longer feel the pressure to meet in person.”',
  },
  {
    avatar: testimonial2,
    name: 'John Onsarigo',
    occupation: 'Community Member, Baringo',
    testimonial:
      '"Before Akiba, our welfare members didn’t even know each other. But now, we all trust the system 100% because there is clarity and everything is easy to follow.”',
  },
  {
    avatar: testimonial3,
    name: 'Saidi Ahmed',
    occupation: 'Resident, Mombasa',
    testimonial:
      '"When I first used Akiba, I had lost a close relative. Everyone who contributed was satisfied because they could see how the money was used."',
  },
  {
    avatar: testimonial4,
    name: 'Rev. Gideon Makau',
    occupation: 'Church Leader, Mlolongo',
    testimonial:
      '"When we set out to build a new gate for our church, Akiba became an unexpected blessing. All our members insisted on using it to raise and manage the funds."',
  },
  {
    avatar: testimonial5,
    name: 'Jacob Mwai',
    occupation: 'Boda boda rider, Kiambu',
    testimonial:
      '"Akiba came to save me as a boda boda chairman. Handling my colleagues\' money manually, used to give me headaches. I\'m truly happy that this platform was created."',
  },
  {
    avatar: testimonial6,
    name: 'Geraldine Ouma',
    occupation: 'Consultant, Nairobi',
    testimonial:
      '"Akiba has brought us closer together as a family, even with our kids living abroad. It feels like we are always in the same room discussing our savings."'
  },
];

export default function Testimonials() {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  return (
    <Container
      id="testimonials"
      sx={{
        pt: { xs: 4, sm: 12 },
        pb: { xs: 8, sm: 16 },
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: { xs: 3, sm: 6 },
      }}
    >
      <Box
        sx={{
          width: { sm: '100%', md: '60%' },
          textAlign: { sm: 'left', md: 'center' },
        }}
      >
        <Typography
          component="h2"
          variant="h4"
          gutterBottom
          sx={{ color: darkMode ? '#ffffff' : 'text.primary' }}
        >
          Testimonials
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: darkMode ? 'grey.300' : 'text.secondary',
            fontSize: '0.875rem',
            lineHeight: 1.5,
          }}
        >
          See what our clients love about Akiba. Real stories of how we are reshaping the way people save and achieve shared goals through collective effort.
        </Typography>
      </Box>
      <Grid container spacing={2}>
        {userTestimonials.map((testimonial, index) => (
          <Grid item xs={12} sm={6} md={4} key={index} sx={{ display: 'flex' }}>
            <Card
              variant="outlined"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                flexGrow: 1,
                bgcolor: darkMode ? 'grey.800' : 'background.paper',
                borderColor: darkMode ? 'grey.700' : 'divider',
              }}
            >
              <CardContent>
                <Typography
                  variant="body2"
                  gutterBottom
                  sx={{ 
                    color: darkMode ? 'grey.300' : 'text.secondary',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                  }}
                >
                  {testimonial.testimonial}
                </Typography>
              </CardContent>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  borderTop: '1px solid',
                  borderColor: darkMode ? 'grey.700' : 'divider',
                }}
              >
                <CardHeader
                  avatar={
                    <Avatar
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      sx={{ width: 40, height: 40 }}
                    />
                  }
                  title={
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        color: darkMode ? '#ffffff' : 'text.primary',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                      }}
                    >
                      {testimonial.name}
                    </Typography>
                  }
                  subheader={
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: darkMode ? 'grey.400' : 'text.secondary',
                        fontSize: '0.75rem',
                      }}
                    >
                      {testimonial.occupation}
                    </Typography>
                  }
                  sx={{ p: 0 }}
                />
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
