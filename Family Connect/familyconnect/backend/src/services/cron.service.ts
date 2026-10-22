import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const startCronJobs = () => {
  // Run every day at midnight server time
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily notification cron job...');
    try {
      await generateUpcomingBirthdayNotifications();
      // You can add generateUpcomingAnniversaryNotifications() here later
    } catch (error) {
      console.error('Error running cron job:', error);
    }
  });
};

const generateUpcomingBirthdayNotifications = async () => {
  // Get today and 7 days from now
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  
  const nextWeekMonth = nextWeek.getMonth() + 1;
  const nextWeekDay = nextWeek.getDate();

  // Find living members with a birthDate
  const members = await prisma.member.findMany({
    where: {
      isAlive: true,
      birthDate: { not: null }
    },
    include: {
      tree: {
        include: {
          accessControl: true
        }
      }
    }
  });

  for (const member of members) {
    if (!member.birthDate) continue;
    
    const birthDate = new Date(member.birthDate);
    const birthMonth = birthDate.getMonth() + 1;
    const birthDay = birthDate.getDate();

    // Check if birthday falls in the next 7 days window (ignoring year)
    let isUpcoming = false;
    let daysUntil = 0;

    if (todayMonth === nextWeekMonth) {
      if (birthMonth === todayMonth && birthDay >= todayDay && birthDay <= nextWeekDay) {
        isUpcoming = true;
        daysUntil = birthDay - todayDay;
      }
    } else {
      // Handles month wrap-around (e.g. Feb 28 to Mar 7)
      if ((birthMonth === todayMonth && birthDay >= todayDay) || 
          (birthMonth === nextWeekMonth && birthDay <= nextWeekDay)) {
        isUpcoming = true;
        if (birthMonth === todayMonth) {
          const daysInMonth = new Date(today.getFullYear(), todayMonth, 0).getDate();
          daysUntil = (daysInMonth - todayDay) + birthDay;
        } else {
          const daysInMonth = new Date(today.getFullYear(), todayMonth, 0).getDate();
          daysUntil = (daysInMonth - todayDay) + birthDay;
        }
      }
    }

    if (isUpcoming) {
      const ageTurning = today.getFullYear() - birthDate.getFullYear();
      
      // Generate notification for admins of this tree
      for (const access of member.tree.accessControl) {
        if (access.role === 'admin' || access.role === 'family_head') {
          const title = daysUntil === 0 ? "Birthday Today!" : "Upcoming Birthday";
          const message = daysUntil === 0 
            ? `It's ${member.name}'s birthday today! They are turning ${ageTurning}.`
            : `${member.name}'s birthday is coming up in ${daysUntil} days. They will be turning ${ageTurning}.`;

          // Ensure we don't spam the same notification on the exact same day
          const existing = await prisma.notification.findFirst({
            where: {
              userId: access.userId,
              title: title,
              message: message,
              createdAt: {
                gte: new Date(new Date().setHours(0,0,0,0))
              }
            }
          });

          if (!existing) {
            await prisma.notification.create({
              data: {
                userId: access.userId,
                title,
                message
              }
            });
          }
        }
      }
    }
  }
};
