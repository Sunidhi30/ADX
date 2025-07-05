// // jobs/campaignScheduler.js
// const cron = require('node-cron');
// const AdCampaign = require('../models/AdCampaign'); // adjust path as needed
// const User = require('../models/User'); // you missed this in your original code
// const axios = require('axios');

// function startCampaignScheduler() {
//   cron.schedule('* * * * *', async () => {
//     // console.log('⏰ Checking for scheduled campaigns...');
//     const now = new Date();
//     // Find campaigns to activate
//     const campaignsToStart = await AdCampaign.find({
//       status: 'SCHEDULED',
//       'schedule.startTime': { $lte: now }
//     });

//     for (const campaign of campaignsToStart) {
//       try {
//         const user = await User.findById(campaign.userId);
//         if (!user?.integrations?.metaAds?.isConnected) {
//           console.log(`⚠️ User ${campaign.userId} not connected to Meta Ads`);
//           continue;
//         }

//         const { accessToken } = user.integrations.metaAds;

//         // Activate campaign on Facebook
//         await axios.post(
//           `https://graph.facebook.com/v19.0/${campaign.campaignId}`,
//           { status: 'ACTIVE', access_token: accessToken }
//         );

//         campaign.status = 'ACTIVE';
//         await campaign.save();

//         console.log(`✅ Activated campaign: ${campaign.campaignName}`);
//       } catch (err) {
//         console.error(`❌ Failed to activate campaign ${campaign._id}`, err.message);
//       }
//     }

//     // Find campaigns to pause
//     const campaignsToPause = await AdCampaign.find({
//       status: 'ACTIVE',
//       'schedule.endTime': { $lte: now }
//     });

//     for (const campaign of campaignsToPause) {
//       try {
//         const user = await User.findById(campaign.userId);
//         if (!user?.integrations?.metaAds?.isConnected) continue;

//         const { accessToken } = user.integrations.metaAds;

//         // Pause campaign on Facebook
//         await axios.post(
//           `https://graph.facebook.com/v19.0/${campaign.campaignId}`,
//           { status: 'PAUSED', access_token: accessToken }
//         );

//         campaign.status = 'PAUSED';
//         await campaign.save();

//         console.log(`⏸️ Paused campaign: ${campaign.campaignName}`);
//       } catch (err) {
//         console.error(`❌ Failed to pause campaign ${campaign._id}`, err.message);
//       }
//     }
//   });
// }

// module.exports = startCampaignScheduler;
