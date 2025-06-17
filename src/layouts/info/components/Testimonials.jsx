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

const userTestimonials = [
  {
    avatar: 'https://i.pravatar.cc/150?img=1',
    name: 'Mary Wambui',
    occupation: 'Chama Treasurer, Nairobi',
    testimonial:
      '“I’m part of a local chama here in Kenya, and Akiba has completely changed how we manage everything. From contributions, withdrawals and reports to our chama discussions. Everything happens on Akiba. It’s so seamless that we no longer feel the pressure to meet in person. Everything we need is right there!”',
  },
  {
    avatar: 'https://i.pravatar.cc/150?img=2',
    name: 'John Onsarigo',
    occupation: 'Community Member, Baringo',
    testimonial:
      "Before Akiba, things were very difficult for our community. I didn’t even know everyone in our community welfare savings group. But with Akiba, it’s so simple — I can see when each person contributes and where the money goes. I trust the system 100% because everything is clear and easy to follow.”",
  },
  {
    avatar: 'https://i.pravatar.cc/150?img=3',
    name: 'Saidi Ahmed',
    occupation: 'Resident, Mombasa',
    testimonial:
      "When I lost a close relative, Akiba made it easy to create an account, invite family and friends, and with the help of sub-admins, we managed to cover all the expenses with full transparency. Everyone was satisfied and grateful for the accountability because they could see how the money was used.",
  },
  {
    avatar: 'https://i.pravatar.cc/150?img=1',
    name: 'Rev. Gideon Makau',
    occupation: 'Church Leader, Mlolongo',
    testimonial:
      "When we set out to build a new gate for our church, Akiba became an unexpected blessing. I was able to rally members effortlessly, and everyone could see who contributed, how much and exactly how the funds were spent. It made the whole process transparent, accountable and brought us closer as a church family.",
  },
  {
    avatar: 'https://i.pravatar.cc/150?img=2',
    name: 'Jacob Mwai',
    occupation: 'Boda boda rider, Kiambu',
    testimonial:
      "Before Akiba came, I used to manually collect daily contributions from our boda boda base members. Now, Akiba has made everything easy for me. I just coordinate contributions and ensure the correct receipient gets their dues. No stress, no confusion",
  },
  {
    avatar: 'https://i.pravatar.cc/150?img=3',
    name: 'Geraldine Ouma',
    occupation: 'Consultant, Nairobi',
    testimonial:
      "Akiba has brought us closer together as a family, even with our kids living abroad. I created an account and added my wife and first born son as sub admins. We save together for emergencies and the funds have always been useful to all of us no matter where we are.",
  },
];

const darkModeLogos = [
  'https://assets-global.website-files.com/61ed56ae9da9fd7e0ef0a967/6560628e8573c43893fe0ace_Sydney-white.svg',
  'https://assets-global.website-files.com/61ed56ae9da9fd7e0ef0a967/655f4d520d0517ae8e8ddf13_Bern-white.svg',
  'https://assets-global.website-files.com/61ed56ae9da9fd7e0ef0a967/655f46794c159024c1af6d44_Montreal-white.svg',
  'https://assets-global.website-files.com/61ed56ae9da9fd7e0ef0a967/61f12e891fa22f89efd7477a_TerraLight.svg',
  'https://assets-global.website-files.com/61ed56ae9da9fd7e0ef0a967/6560a09d1f6337b1dfed14ab_colorado-white.svg',
  'https://assets-global.website-files.com/61ed56ae9da9fd7e0ef0a967/655f5caa77bf7d69fb78792e_Ankara-white.svg',
];

const lightModeLogos = [
  'https://assets-global.website-files.com/61ed56ae9da9fd7e0ef0a967/6560628889c3bdf1129952dc_Sydney-black.svg',
  'https://assets-global.website-files.com/61ed56ae9da9fd7e0ef0a967/655f4d4d8b829a89976a419c_Bern-black.svg',
  'https://assets-global.website-files.com/61ed56ae9da9fd7e0ef0a967/655f467502f091ccb929529d_Montreal-black.svg',
  'https://assets-global.website-files.com/61ed56ae9da9fd7e0ef0a967/61f12e911fa22f2203d7514c_TerraDark.svg',
  'https://assets-global.website-files.com/61ed56ae9da9fd7e0ef0a967/6560a0990f3717787fd49245_colorado-black.svg',
  'https://assets-global.website-files.com/61ed56ae9da9fd7e0ef0a967/655f5ca4e548b0deb1041c33_Ankara-black.svg',
];

const logoStyle = {
  width: '64px',
  opacity: 0.3,
};

export default function Testimonials() {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const logos = darkMode ? darkModeLogos : lightModeLogos;

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
          See what people love about Akiba. Real stories from groups and individuals who’ve transformed the way they save, collaborate and achieve shared financial goals.
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
                <img
                  src={logos[index]}
                  alt={`Logo ${index + 1}`}
                  style={logoStyle}
                />
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
