
const axios = require('axios');
const User = require('../models/User');
const AdCampaign = require('../models/AdCampaign');
FACEBOOK_REDIRECT_URI='http://localhost:9000/api/meta-ads/callback'
const FACEBOOK_API_VERSION = 'v19.0';
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

class MetaAdsController {
  // Connect Facebook/Meta account
 // controllers/metaAdsController.js
// controllers/metaAdsController.js
static async connectFacebook(req, res) {
  try {
    const { userId } = req.body;
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
      `client_id=${process.env.FACEBOOK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI)}&` +
      `state=${state}&` +
      `scope=ads_management,ads_read,business_management,pages_show_list,pages_read_engagement,public_profile`;

    res.json({ success: true, authUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

  // Handle Facebook OAuth callback
  // static async handleFacebookCallback(req, res) {
  //   try {
  //     const { code, state } = req.query;
  //     const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
  
  //     // Exchange code for access token
  //     const tokenResponse = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
  //       params: {
  //         client_id: process.env.FACEBOOK_APP_ID,
  //         client_secret: process.env.FACEBOOK_APP_SECRET,
  //         redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
  //         code
  //       }
  //     });
  
  //     // Make sure we have expires_in in the response
  //     const expiresIn = tokenResponse.data.expires_in || 5184000; // Default to 60 days if not provided
  //     const tokenExpiry = new Date(Date.now() + (expiresIn * 1000));
  
  //     // Verify the date is valid
  //     if (isNaN(tokenExpiry.getTime())) {
  //       throw new Error('Invalid token expiry date calculated');
  //     }
  
  //     // Update user with Meta integration details
  //     await User.findByIdAndUpdate(userId, {
  //       $set: {
  //         'integrations.metaAds': {
  //           isConnected: true,
  //           accessToken: tokenResponse.data.access_token,
  //           tokenExpiry: tokenExpiry
  //         }
  //       }
  //     });
  
  //     res.json({ 
  //       success: true,
  //       message: 'Facebook successfully connected',
  //       data: {
  //         accessToken: tokenResponse.data.access_token,
  //         expiresIn: expiresIn,
  //         tokenExpiry: tokenExpiry
  //       }
  //     });
  
  //   } catch (error) {
  //     console.error('Facebook callback error:', error);
  //     res.status(500).json({ 
  //       success: false, 
  //       error: error.message,
  //       details: 'Failed to process Facebook callback'
  //     });
  //   }
  // }
  static async handleFacebookCallback(req, res) {
    try {
      const { code, state } = req.query;
      const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
  
      // Exchange code for access token
      const tokenResponse = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
          code
        }
      });
  
      const accessToken = tokenResponse.data.access_token;
      const expiresIn = tokenResponse.data.expires_in || 5184000; // Default 60 days
      const tokenExpiry = new Date(Date.now() + (expiresIn * 1000));
  
      // Verify date
      if (isNaN(tokenExpiry.getTime())) {
        throw new Error('Invalid token expiry date calculated');
      }
  
      // 🟢 Fetch user's ad accounts
      const adAccountsResponse = await axios.get(`https://graph.facebook.com/v19.0/me/adaccounts`, {
        params: {
          fields: 'id,name,account_status',
          access_token: accessToken
        }
      });
  
      console.log('Ad Accounts Response:', JSON.stringify(adAccountsResponse.data, null, 2));
  
      // 🔥 Pick the first active ad account
      const activeAdAccount = adAccountsResponse.data.data.find(acc => acc.account_status === 1);
  
      if (!activeAdAccount) {
        return res.status(400).json({
          success: false,
          message: 'No active ad accounts found. Please create one in Facebook Business Manager.'
        });
      }
  
      // 🟢 Update user with Meta integration details
      await User.findByIdAndUpdate(userId, {
        $set: {
          'integrations.metaAds': {
            isConnected: true,
            accessToken: accessToken,
            tokenExpiry: tokenExpiry,
            adAccountId: activeAdAccount.id // ✅ Save adAccountId
          }
        }
      });
  
      res.json({
        success: true,
        message: 'Facebook successfully connected',
        data: {
          accessToken: accessToken,
          expiresIn: expiresIn,
          tokenExpiry: tokenExpiry,
          adAccount: activeAdAccount // ✅ Return ad account for confirmation
        }
      });
    } catch (error) {
      console.error('Facebook callback error:', error.response?.data || error);
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.response?.data || 'Failed to process Facebook callback'
      });
    }
  }
  
  // static async handleFacebookCallback(req, res) {
  //   try {
  //     const { code, state } = req.query;
  //     const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
  
  //     // Exchange code for access token
  //     const tokenResponse = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
  //       params: {
  //         client_id: process.env.FACEBOOK_APP_ID,
  //         client_secret: process.env.FACEBOOK_APP_SECRET,
  //         redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
  //         code
  //       }
  //     });
  
  //     const accessToken = tokenResponse.data.access_token;
  
  //     // Get user's ad accounts
  //     const adAccountsResponse = await axios.get(`https://graph.facebook.com/v19.0/me/adaccounts`, {
  //       params: {
  //         fields: 'id,name,account_status',
  //         access_token: accessToken
  //       }
  //     });
  
  //     // Get the first active ad account
  //     const adAccount = adAccountsResponse.data.data.find(acc => acc.account_status === 1) || adAccountsResponse.data.data[0];
  
  //     if (!adAccount) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'No ad account found'
  //       });
  //     }
  
  //     // Update user with Meta integration details
  //     await User.findByIdAndUpdate(userId, {
  //       'integrations.metaAds': {
  //         isConnected: true,
  //         accessToken: accessToken,
  //         tokenExpiry: new Date(Date.now() + (tokenResponse.data.expires_in * 1000)),
  //         adAccountId: adAccount.id // Store the ad account ID
  //       }
  //     });
  
  //     res.json({ 
  //       success: true,
  //       message: 'Facebook connected successfully',
  //       adAccount: adAccount
  //     });
  //   } catch (error) {
  //     console.error('Facebook callback error:', error.response?.data || error);
  //     res.status(500).json({ 
  //       success: false, 
  //       error: error.message,
  //       details: error.response?.data
  //     });
  //   }
  // }

  // Get user's ad accounts
static async getAdAccounts(req, res) {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId);

      if (!user?.integrations?.metaAds?.isConnected) {
        return res.status(400).json({
          success: false,
          message: 'Meta Ads not connected'
        });
      }

      const { accessToken } = user.integrations.metaAds;

      const response = await axios.get(`https://graph.facebook.com/v19.0/me/adaccounts`, {
        params: {
          fields: 'id,name,account_status,currency,timezone_name,amount_spent,balance',
          access_token: accessToken
        }
      });

      res.json({
        success: true,
        data: response.data.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ad accounts',
        error: error.response?.data?.error?.message || error.message
      });
    }
  }
  static async createCampaign(req, res) {
    try {
      const { userId } = req.params;
      const { campaignName, objective, budget, targeting, creative } = req.body;
  
      const user = await User.findById(userId);
      if (!user?.integrations?.metaAds?.isConnected) {
        return res.status(400).json({ success: false, message: 'Meta Ads not connected' });
      }
  
      const accessToken = user.integrations.metaAds.accessToken;
      const adAccountId = user.integrations.metaAds.adAccountId;
  
      if (!adAccountId) {
        return res.status(400).json({ success: false, message: 'No Ad Account ID found for user' });
      }
  
      // Validate Objective
      const VALID_OBJECTIVES = [
        "OUTCOME_AWARENESS",
        "OUTCOME_TRAFFIC",
        "OUTCOME_ENGAGEMENT",
        "OUTCOME_LEADS",
        "OUTCOME_SALES",
        "OUTCOME_APP_PROMOTION"
      ];
      const normalizedObjective = objective?.toUpperCase();
      if (!VALID_OBJECTIVES.includes(normalizedObjective)) {
        return res.status(400).json({
          success: false,
          message: `Invalid objective. Must be one of: ${VALID_OBJECTIVES.join(", ")}`
        });
      }
  
      // Resolve Interests
      let resolvedInterests = [];
      if (Array.isArray(targeting.interests)) {
        for (const interestName of targeting.interests) {
          const searchRes = await axios.get(
            `https://graph.facebook.com/v19.0/search`,
            {
              params: {
                type: 'adinterest',
                q: interestName,
                access_token: accessToken
              }
            }
          );
  
          const matchedInterest = searchRes.data.data?.[0];
          if (matchedInterest) {
            resolvedInterests.push({
              id: matchedInterest.id,
              name: matchedInterest.name
            });
          }
        }
      }
  
      console.log('Resolved Interests:', resolvedInterests);
  
      // Create Campaign
      const campaignResponse = await axios.post(
        `https://graph.facebook.com/v19.0/${adAccountId}/campaigns`,
        {
          name: campaignName,
          objective: normalizedObjective,
          status: 'PAUSED',
          special_ad_categories: ['NONE'],
          access_token: accessToken
        }
      );
  
      console.log('Created Campaign:', campaignResponse.data);
  
      // Create Ad Set with Advantage Audience flag
      const adSetResponse = await axios.post(
        `https://graph.facebook.com/v19.0/${adAccountId}/adsets`,
        {
          name: `${campaignName} - Ad Set`,
          campaign_id: campaignResponse.data.id,
          daily_budget: budget.amount * 100, // Facebook expects in cents
          billing_event: 'IMPRESSIONS',
          optimization_goal: 'REACH',
          bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
          targeting: {
            age_min: targeting.ageMin || 18,
            age_max: targeting.ageMax || 65,
            genders: targeting.genders || [],
            geo_locations: {
              countries: targeting.locations || ['US']
            },
            interests: resolvedInterests,
            targeting_automation: {
              advantage_audience: 0 // 🔥 Explicitly disable Advantage Audience
            }
          },
          status: 'PAUSED',
          access_token: accessToken
        }
      );
  
      console.log('Created Ad Set:', adSetResponse.data);
  
      // Save to DB
      const adCampaign = new AdCampaign({
        userId,
        campaignId: campaignResponse.data.id,
        adSetId: adSetResponse.data.id,
        campaignName,
        objective: normalizedObjective,
        budget,
        targeting,
        creative,
        status: 'DRAFT'
      });
      await adCampaign.save();
  
      return res.json({
        success: true,
        message: 'Campaign created successfully',
        campaign: adCampaign,
        facebookCampaign: campaignResponse.data,
        facebookAdSet: adSetResponse.data
      });
    } catch (error) {
      console.error('Create campaign error:', error.response?.data || error);
      return res.status(500).json({
        success: false,
        error: error.response?.data?.error?.message || error.message,
        details: error.response?.data
      });
    }
  }
  
  

  // static async createCampaign(req, res) {
  //   try {
  //     const { userId } = req.params;
  //     const { campaignName, objective, budget, targeting, creative } = req.body;
  
  //     // Fetch user from DB
  //     const user = await User.findById(userId);
  
  //     if (!user?.integrations?.metaAds?.isConnected) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Meta Ads not connected'
  //       });
  //     }
  
  //     const { accessToken, adAccountId } = user.integrations.metaAds;
  
  //     if (!adAccountId) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'No ad account ID found'
  //       });
  //     }
  
  //     // ✅ Normalize and validate objective
  //     const VALID_OBJECTIVES = [
  //       "OUTCOME_AWARENESS",
  //       "OUTCOME_TRAFFIC",
  //       "OUTCOME_ENGAGEMENT",
  //       "OUTCOME_LEADS",
  //       "OUTCOME_SALES",
  //       "OUTCOME_APP_PROMOTION"
  //     ];
  
  //     const normalizedObjective = objective?.toUpperCase();
  
  //     if (!VALID_OBJECTIVES.includes(normalizedObjective)) {
  //       return res.status(400).json({
  //         success: false,
  //         message: `Invalid objective. Must be one of: ${VALID_OBJECTIVES.join(", ")}`
  //       });
  //     }
  
  //     // ✅ Map objective to valid optimization goal
  //     const OPTIMIZATION_GOALS_MAP = {
  //       OUTCOME_AWARENESS: "REACH",
  //       OUTCOME_TRAFFIC: "LINK_CLICKS",
  //       OUTCOME_ENGAGEMENT: "POST_ENGAGEMENT",
  //       OUTCOME_LEADS: "LEAD_GENERATION",
  //       OUTCOME_SALES: "OFFSITE_CONVERSIONS",
  //       OUTCOME_APP_PROMOTION: "APP_INSTALLS"
  //     };
  
  //     const optimizationGoal = OPTIMIZATION_GOALS_MAP[normalizedObjective] || "LINK_CLICKS";
  
  //     // ✅ Create campaign on Facebook
  //     const campaignResponse = await axios.post(
  //       `https://graph.facebook.com/v19.0/${adAccountId}/campaigns`,
  //       {
  //         name: campaignName,
  //         objective: normalizedObjective,
  //         status: 'PAUSED',
  //         special_ad_categories: ['NONE'], // Required by Facebook API
  //         access_token: accessToken
  //       }
  //     );
  
  //     console.log('✅ Facebook campaign created:', campaignResponse.data);
  
  //     // ✅ Create ad set on Facebook
  //     const adSetResponse = await axios.post(
  //       `https://graph.facebook.com/v19.0/${adAccountId}/adsets`,
  //       {
  //         name: `${campaignName} - Ad Set`,
  //         campaign_id: campaignResponse.data.id,
  //         daily_budget: budget.amount * 100, // Facebook expects budget in cents
  //         billing_event: 'IMPRESSIONS',
  //         optimization_goal: optimizationGoal, // ✅ mapped optimization goal
  //         bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
  //         targeting: {
  //           age_min: targeting.ageMin || 18,
  //           age_max: targeting.ageMax || 65,
  //           genders: targeting.genders || [],
  //           geo_locations: {
  //             countries: targeting.locations || ['US'] // Default to US if none provided
  //           },
  //           interests: targeting.interests || []
  //         },
  //         status: 'PAUSED',
  //         access_token: accessToken
  //       }
  //     );
  
  //     console.log('✅ Facebook ad set created:', adSetResponse.data);
  
  //     // ✅ Save campaign in DB
  //     const adCampaign = new AdCampaign({
  //       userId,
  //       campaignId: campaignResponse.data.id,
  //       adSetId: adSetResponse.data.id,
  //       campaignName,
  //       objective: normalizedObjective,
  //       budget,
  //       targeting,
  //       creative,
  //       status: 'DRAFT'
  //     });
  
  //     await adCampaign.save();
  
  //     return res.json({
  //       success: true,
  //       message: 'Campaign created successfully',
  //       campaign: adCampaign,
  //       facebookCampaign: campaignResponse.data,
  //       facebookAdSet: adSetResponse.data
  //     });
  
  //   } catch (error) {
  //     console.error('❌ Create campaign error:', error.response?.data || error);
  
  //     return res.status(500).json({
  //       success: false,
  //       error: error.response?.data?.error?.message || error.message,
  //       details: error.response?.data
  //     });
  //   }
  // }
// controllers/MetaAdsController.js

static async searchInterests(req, res) {
  try {
    const { q } = req.query;
    const accessToken = 'EAAeNi343TdUBO4eAoh5ZCqVn3GJLPBs0LtvwXiZCdOpZAe7fVW4GRixiAOwgMEGkBVOevZCdUrMPNeZBihHWd9bqyfhSQvUXPzVFcCnxEv4khpk0xB6h6J8TrI6xm5YO0R39v9GVaP50hvsYXmwZAv2M1EJ3Vz69yMqxl3BsMBqgiMRJsUUBdAM7A5omOgGrs1YVOFUUzeLPAT7tLaWRCtqYKZCCoAoSnHwzw8IbZAPW50MZD';

    const response = await axios.get('https://graph.facebook.com/v19.0/search', {
      params: {
        type: 'adinterest',
        q,
        access_token: accessToken,
      }
    });

    return res.json({ success: true, interests: response.data.data });
  } catch (error) {
    console.error('Search interests error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to search interests',
      error: error.response?.data?.error?.message || error.message,
    });
  }
}
  
// static async createCampaign(req, res) {
//   try {
//     const { userId } = req.params;
//     const { campaignName, objective, budget, targeting, creative } = req.body;

//     // Fetch the user from the database
//     const user = await User.findById(userId);

//     if (!user?.integrations?.metaAds?.isConnected) {
//       return res.status(400).json({
//         success: false,
//         message: 'Meta Ads not connected'
//       });
//     }

//     const { accessToken, adAccountId } = user.integrations.metaAds;

//     if (!adAccountId) {
//       return res.status(400).json({
//         success: false,
//         message: 'No ad account ID found'
//       });
//     }

//     // ✅ Normalize and validate objective
//     const VALID_OBJECTIVES = [
//       "OUTCOME_AWARENESS",
//       "OUTCOME_TRAFFIC",
//       "OUTCOME_ENGAGEMENT",
//       "OUTCOME_LEADS",
//       "OUTCOME_SALES",
//       "OUTCOME_APP_PROMOTION"
//     ];
    

//     const normalizedObjective = objective?.toUpperCase();

//     if (!VALID_OBJECTIVES.includes(normalizedObjective)) {
//       return res.status(400).json({
//         success: false,
//         message: `Invalid objective. Must be one of: ${VALID_OBJECTIVES.join(", ")}`
//       });
//     }

//     // ✅ Create campaign on Facebook
//     const campaignResponse = await axios.post(
//       `https://graph.facebook.com/v19.0/${adAccountId}/campaigns`,
//       {
//         name: campaignName,
//         objective: normalizedObjective,
//         status: 'PAUSED',
//         special_ad_categories: ['NONE'], // Required by Facebook API
//         access_token: accessToken
//       }
//     );

//     console.log('Facebook campaign created:', campaignResponse.data);

//     // ✅ Create ad set on Facebook
//     const adSetResponse = await axios.post(
//       `https://graph.facebook.com/v19.0/${adAccountId}/adsets`,
//       {
//         name: `${campaignName} - Ad Set`,
//         campaign_id: campaignResponse.data.id,
//         daily_budget: budget.amount * 100, // Facebook expects budget in cents
//         billing_event: 'IMPRESSIONS',
//         optimization_goal: normalizedObjective,
//         bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
//         targeting: {
//           age_min: targeting.ageMin || 18,
//           age_max: targeting.ageMax || 65,
//           genders: targeting.genders || [],
//           geo_locations: {
//             countries: targeting.locations || ['US'] // Default to US if none provided
//           },
//           interests: targeting.interests || []
//         },
//         status: 'PAUSED',
//         access_token: accessToken
//       }
//     );

//     console.log('Facebook ad set created:', adSetResponse.data);

//     // ✅ Save to database
//     const adCampaign = new AdCampaign({
//       userId,
//       campaignId: campaignResponse.data.id,
//       adSetId: adSetResponse.data.id,
//       campaignName,
//       objective: normalizedObjective,
//       budget,
//       targeting,
//       creative,
//       status: 'DRAFT'
//     });

//     await adCampaign.save();

//     return res.json({
//       success: true,
//       message: 'Campaign created successfully',
//       campaign: adCampaign,
//       facebookCampaign: campaignResponse.data,
//       facebookAdSet: adSetResponse.data
//     });

//   } catch (error) {
//     console.error('Create campaign error:', error.response?.data || error);

//     return res.status(500).json({
//       success: false,
//       error: error.response?.data?.error?.message || error.message,
//       details: error.response?.data
//     });
//   }
// }

  // Get campaigns
  static async getCampaigns(req, res) {
    try {
      const { userId } = req.params;
      const campaigns = await AdCampaign.find({ userId }).sort({ createdAt: -1 });

      res.json({
        success: true,
        data: campaigns
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch campaigns',
        error: error.message
      });
    }
  }

  // Update campaign status
  static async updateCampaignStatus(req, res) {
    try {
      const { userId, campaignId } = req.params;
      const { status } = req.body;

      const user = await User.findById(userId);
      if (!user?.integrations?.metaAds?.isConnected) {
        return res.status(400).json({
          success: false,
          message: 'Meta Ads not connected'
        });
      }

      const campaign = await AdCampaign.findOne({ userId, _id: campaignId });
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }

      const { accessToken } = user.integrations.metaAds;

      // Update campaign status on Facebook
      await axios.post(`https://graph.facebook.com/v19.0/${campaign.campaignId}`, {
        status: status.toUpperCase(),
        access_token: accessToken
      });

      // Update campaign status in database
      campaign.status = status.toUpperCase();
      await campaign.save();

      res.json({
        success: true,
        message: 'Campaign status updated successfully',
        data: campaign
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update campaign status',
        error: error.response?.data?.error?.message || error.message
      });
    }
  }

  // Get campaign insights
  static async getCampaignInsights(req, res) {
    try {
      const { userId, campaignId } = req.params;
      
      const user = await User.findById(userId);
      if (!user?.integrations?.metaAds?.isConnected) {
        return res.status(400).json({
          success: false,
          message: 'Meta Ads not connected'
        });
      }

      const campaign = await AdCampaign.findOne({ userId, _id: campaignId });
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }

      const { accessToken } = user.integrations.metaAds;

      // Get insights from Facebook
      const insightsResponse = await axios.get(`https://graph.facebook.com/v19.0/${campaign.campaignId}/insights`, {
        params: {
          fields: 'impressions,clicks,spend,reach,ctr,cpm,frequency',
          access_token: accessToken
        }
      });

      const insights = insightsResponse.data.data[0] || {};

      // Update campaign metrics
      campaign.metrics = {
        impressions: parseInt(insights.impressions) || 0,
        clicks: parseInt(insights.clicks) || 0,
        spend: parseFloat(insights.spend) || 0,
        reach: parseInt(insights.reach) || 0,
        ctr: parseFloat(insights.ctr) || 0,
        cpm: parseFloat(insights.cpm) || 0
      };

      await campaign.save();

      res.json({
        success: true,
        data: {
          campaign,
          insights
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch campaign insights',
        error: error.response?.data?.error?.message || error.message
      });
    }
  }

  // Delete campaign
  static async deleteCampaign(req, res) {
    try {
      const { userId, campaignId } = req.params;
      
      const user = await User.findById(userId);
      if (!user?.integrations?.metaAds?.isConnected) {
        return res.status(400).json({
          success: false,
          message: 'Meta Ads not connected'
        });
      }

      const campaign = await AdCampaign.findOne({ userId, _id: campaignId });
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }

      const { accessToken } = user.integrations.metaAds;

      // Delete campaign on Facebook
      await axios.delete(`https://graph.facebook.com/v19.0/${campaign.campaignId}`, {
        params: {
          access_token: accessToken
        }
      });

      // Update campaign status in database
      campaign.status = 'DELETED';
      await campaign.save();

      res.json({
        success: true,
        message: 'Campaign deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete campaign',
        error: error.response?.data?.error?.message || error.message
      });
    }
  }

  // Get page followers
  static async getPageFollowers(req, res) {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId);

      if (!user?.integrations?.metaAds?.isConnected) {
        return res.status(400).json({
          success: false,
          message: 'Meta Ads not connected'
        });
      }

      const { pageId, accessToken } = user.integrations.metaAds;

      if (!pageId) {
        return res.status(400).json({
          success: false,
          message: 'No Facebook page connected'
        });
      }

      const pageResponse = await axios.get(`https://graph.facebook.com/v19.0/${pageId}`, {
        params: {
          fields: 'followers_count,fan_count,name,picture',
          access_token: accessToken
        }
      });

      res.json({
        success: true,
        data: pageResponse.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch page followers',
        error: error.response?.data?.error?.message || error.message
      });
    }
  }
}

module.exports = MetaAdsController;