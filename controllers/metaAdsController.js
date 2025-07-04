
const axios = require('axios');
const User = require('../models/User');
const AdCampaign = require('../models/AdCampaign');
FACEBOOK_REDIRECT_URI='http://localhost:9000/api/meta-ads/callback'


// At the top of your file
require('dotenv').config();

const FACEBOOK_API_VERSION = 'v19.0';
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;
class MetaAdsController {

// controllers/metaAdsController.js
static async connectFacebook(req, res) {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId is required' 
      });
    }

    // Create state parameter with userId
    const stateParam = {
      userId: userId,
      timestamp: Date.now() // Add timestamp for additional security
    };

    const state = Buffer.from(JSON.stringify(stateParam)).toString('base64');
    
    const authUrl = `https://www.facebook.com/${FACEBOOK_API_VERSION}/dialog/oauth?` +
      `client_id=${process.env.FACEBOOK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI)}&` +
      `state=${state}&` +
      `scope=ads_management,ads_read,business_management,pages_show_list,pages_read_engagement,public_profile`;

    // Log the generated state for debugging
    console.log('Generated state:', state);
    console.log('Auth URL:', authUrl);

    res.json({ 
      success: true, 
      authUrl,
      debug: {
        state: state,
        userId: userId
      }
    });
  } catch (error) {
    console.error('Connect Facebook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
static async handleFacebookCallback(req, res) {
  try {
    const { code, state } = req.query;

    // Validate required parameters
    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: code and state'
      });
    }

    // Decode and parse state parameter
    let decodedState;
    try {
      const stateString = Buffer.from(state, 'base64').toString();
      decodedState = JSON.parse(stateString);
    } catch (parseError) {
      console.error('State parsing error:', parseError);
      return res.status(400).json({
        success: false,
        error: 'Invalid state parameter',
        debug: { state }
      });
    }

    const { userId } = decodedState;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid state: missing userId',
        debug: { decodedState }
      });
    }

    // Exchange code for access token
    const tokenResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/oauth/access_token`, {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
        code
      }
    });

    const accessToken = tokenResponse.data.access_token;
    const expiresIn = tokenResponse.data.expires_in || 5184000;
    const tokenExpiry = new Date(Date.now() + (expiresIn * 1000));

    // Fetch user's ad accounts
    const adAccountsResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/me/adaccounts`, {
      params: {
        fields: 'id,name,account_status,business',
        access_token: accessToken
      }
    });

    const activeAdAccount = adAccountsResponse.data.data.find(acc => acc.account_status === 1);

    if (!activeAdAccount) {
      return res.status(400).json({
        success: false,
        message: 'No active ad accounts found'
      });
    }

    // Fetch user's pages
    const pagesResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/me/accounts`, {
      params: {
        access_token: accessToken
      }
    });

    const page = pagesResponse.data.data[0]; // Get the first page

    // Prepare meta data for integration update
    const metaData = {
      adAccountId: activeAdAccount.id,
      accessToken: accessToken,
      tokenExpiry: tokenExpiry,
      pageId: page?.id,
      businessId: activeAdAccount.business?.id
    };

    // Use the static method to update user meta integration
    await MetaAdsController.updateUserMetaIntegration(userId, metaData);

    res.json({
      success: true,
      message: 'Facebook successfully connected',
      data: {
        accessToken: accessToken,
        expiresIn: expiresIn,
        tokenExpiry: tokenExpiry,
        adAccount: activeAdAccount,
        page: page
      }
    });

  } catch (error) {
    console.error('Facebook callback error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to process Facebook callback'
    });
  }
}

// Add this static method to your MetaAdsController class
static async updateUserMetaIntegration(userId, metaData) {
  try {
    const result = await User.findByIdAndUpdate(userId, {
      'integrations.metaAds': {
        isConnected: true,
        adAccountId: metaData.adAccountId,
        accessToken: metaData.accessToken,
        tokenExpiry: metaData.tokenExpiry,
        pageId: metaData.pageId,
        businessId: metaData.businessId
      }
    }, { new: true });

    if (!result) {
      throw new Error('User not found');
    }

    return result;
  } catch (error) {
    console.error('Error updating user meta integration:', error);
    throw error;
  }
}
// static async handleFacebookCallback(req, res) {
//   try {
//     const { code, state } = req.query;

//     // Validate required parameters
//     if (!code || !state) {
//       return res.status(400).json({
//         success: false,
//         error: 'Missing required parameters: code and state'
//       });
//     }

//     // Decode and parse state parameter
//     let decodedState;
//     try {
//       const stateString = Buffer.from(state, 'base64').toString();
//       decodedState = JSON.parse(stateString);
//     } catch (parseError) {
//       console.error('State parsing error:', parseError);
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid state parameter',
//         debug: { state }
//       });
//     }

//     const { userId } = decodedState;

//     if (!userId) {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid state: missing userId',
//         debug: { decodedState }
//       });
//     }

//     // Exchange code for access token
//     const tokenResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/oauth/access_token`, {
//       params: {
//         client_id: process.env.FACEBOOK_APP_ID,
//         client_secret: process.env.FACEBOOK_APP_SECRET,
//         redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
//         code
//       }
//     });

//     const accessToken = tokenResponse.data.access_token;
//     const expiresIn = tokenResponse.data.expires_in || 5184000;
//     const tokenExpiry = new Date(Date.now() + (expiresIn * 1000));

//     // Fetch user's ad accounts
//     const adAccountsResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/me/adaccounts`, {
//       params: {
//         fields: 'id,name,account_status,business',
//         access_token: accessToken
//       }
//     });

//     const activeAdAccount = adAccountsResponse.data.data.find(acc => acc.account_status === 1);

//     if (!activeAdAccount) {
//       return res.status(400).json({
//         success: false,
//         message: 'No active ad accounts found'
//       });
//     }

//     // Update user with Meta integration details
//     await User.findByIdAndUpdate(userId, {
//       $set: {
//         'integrations.metaAds': {
//           isConnected: true,
//           accessToken: accessToken,
//           tokenExpiry: tokenExpiry,
//           adAccountId: activeAdAccount.id
//         }
//       }
//     });

//     res.json({
//       success: true,
//       message: 'Facebook successfully connected',
//       data: {
//         accessToken: accessToken,
//         expiresIn: expiresIn,
//         tokenExpiry: tokenExpiry,
//         adAccount: activeAdAccount
//       }
//     });

//   } catch (error) {
//     console.error('Facebook callback error:', error.response?.data || error);
//     res.status(500).json({
//       success: false,
//       error: error.message,
//       details: error.response?.data || 'Failed to process Facebook callback'
//     });
//   }
// }
static async getAdAccounts(req, res) {
  try {
    const { userId } = req.params;
    
    // Add console.log for debugging
    console.log('Fetching ad accounts for userId:', userId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user?.integrations?.metaAds?.isConnected) {
      return res.status(400).json({
        success: false,
        message: 'Meta Ads not connected'
      });
    }

    const { accessToken } = user.integrations.metaAds;
    
    // Log the access token (remove in production)
    console.log('Using access token:', accessToken);

    const response = await axios.get(`https://graph.facebook.com/v19.0/me/adaccounts`, {
      params: {
        fields: 'id,name,account_status,currency,timezone_name,amount_spent,balance',
        access_token: accessToken
      },
      headers: {
        'Accept': 'application/json'
      }
    });

    // Log the response for debugging
    console.log('Facebook API Response:', response.data);

    return res.status(200).json({
      success: true,
      data: response.data.data
    });
  } catch (error) {
    console.error('Get Ad Accounts Error:', error.response?.data || error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch ad accounts',
      error: error.response?.data?.error?.message || error.message,
      details: error.response?.data
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
//     try {
//       const { userId } = req.params;
//       const { campaignName, objective, budget, targeting, creative } = req.body;
  
//       const user = await User.findById(userId);
//       if (!user?.integrations?.metaAds?.isConnected) {
//         return res.status(400).json({ success: false, message: 'Meta Ads not connected' });
//       }
  
//       const accessToken = user.integrations.metaAds.accessToken;
//       const adAccountId = user.integrations.metaAds.adAccountId;
  
//       if (!adAccountId) {
//         return res.status(400).json({ success: false, message: 'No Ad Account ID found for user' });
//       }
  
//       // Validate Objective
//       const VALID_OBJECTIVES = [
//         "OUTCOME_AWARENESS",
//         "OUTCOME_TRAFFIC",
//         "OUTCOME_ENGAGEMENT",
//         "OUTCOME_LEADS",
//         "OUTCOME_SALES",
//         "OUTCOME_APP_PROMOTION"
//       ];
//       const normalizedObjective = objective?.toUpperCase();
//       if (!VALID_OBJECTIVES.includes(normalizedObjective)) {
//         return res.status(400).json({
//           success: false,
//           message: `Invalid objective. Must be one of: ${VALID_OBJECTIVES.join(", ")}`
//         });
//       }
  
//       // Resolve Interests
//       let resolvedInterests = [];
//       if (Array.isArray(targeting.interests)) {
//         for (const interestName of targeting.interests) {
//           const searchRes = await axios.get(
//             `https://graph.facebook.com/v19.0/search`,
//             {
//               params: {
//                 type: 'adinterest',
//                 q: interestName,
//                 access_token: accessToken
//               }
//             }
//           );
  
//           const matchedInterest = searchRes.data.data?.[0];
//           if (matchedInterest) {
//             resolvedInterests.push({
//               id: matchedInterest.id,
//               name: matchedInterest.name
//             });
//           }
//         }
//       }
  
//       console.log('Resolved Interests:', resolvedInterests);
  
//       // Create Campaign
//       const campaignResponse = await axios.post(
//         `https://graph.facebook.com/v19.0/${adAccountId}/campaigns`,
//         {
//           name: campaignName,
//           objective: normalizedObjective,
//           status: 'PAUSED',
//           special_ad_categories: ['NONE'],
//           access_token: accessToken
//         }
//       );
  
//       console.log('Created Campaign:', campaignResponse.data);
  
//       // Create Ad Set with Advantage Audience flag
//       const adSetResponse = await axios.post(
//         `https://graph.facebook.com/v19.0/${adAccountId}/adsets`,
//         {
//           name: `${campaignName} - Ad Set`,
//           campaign_id: campaignResponse.data.id,
//           daily_budget: budget.amount * 100, // Facebook expects in cents
//           billing_event: 'IMPRESSIONS',
//           optimization_goal: 'REACH',
//           bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
//           targeting: {
//             age_min: targeting.ageMin || 18,
//             age_max: targeting.ageMax || 65,
//             genders: targeting.genders || [],
//             geo_locations: {
//               countries: targeting.locations || ['US']
//             },
//             interests: resolvedInterests,
//             targeting_automation: {
//               advantage_audience: 0 // 🔥 Explicitly disable Advantage Audience
//             }
//           },
//           status: 'PAUSED',
//           access_token: accessToken
//         }
//       );
  
//       console.log('Created Ad Set:', adSetResponse.data);
  
//       // Save to DB
//       const adCampaign = new AdCampaign({
//         userId,
//         campaignId: campaignResponse.data.id,
//         adSetId: adSetResponse.data.id,
//         campaignName,
//         objective: normalizedObjective,
//         budget,
//         targeting,
//         creative,
//         status: 'DRAFT'
//       });
//       await adCampaign.save();
  
//       return res.json({
//         success: true,
//         message: 'Campaign created successfully',
//         campaign: adCampaign,
//         facebookCampaign: campaignResponse.data,
//         facebookAdSet: adSetResponse.data
//       });
//     } catch (error) {
//       console.error('Create campaign error:', error.response?.data || error);
//       return res.status(500).json({
//         success: false,
//         error: error.response?.data?.error?.message || error.message,
//         details: error.response?.data
//       });
//     }
// }
//search interest on
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

    // Change this line to use campaignId instead of _id
    const campaign = await AdCampaign.findOne({ userId, campaignId });
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
// static async getCampaignInsights(req, res) {
//   try {
//     const { userId, campaignId } = req.params;
    
//     const user = await User.findById(userId);
//     if (!user?.integrations?.metaAds?.isConnected) {
//       return res.status(400).json({
//         success: false,
//         message: 'Meta Ads not connected'
//       });
//     }

//     const campaign = await AdCampaign.findOne({ 
//       userId, 
//       campaignId: campaignId // Using Facebook's campaign ID
//     });

//     if (!campaign) {
//       return res.status(404).json({
//         success: false,
//         message: 'Campaign not found'
//       });
//     }

//     const { accessToken } = user.integrations.metaAds;

//     // Verify campaign exists on Facebook
//     try {
//       await axios.get(`${FACEBOOK_GRAPH_URL}/${campaignId}`, {
//         params: { access_token: accessToken }
//       });
//     } catch (fbError) {
//       return res.status(400).json({
//         success: false,
//         message: 'Campaign not found on Facebook or access denied',
//         error: fbError.response?.data?.error?.message
//       });
//     }

//     const insightsResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/${campaignId}/insights`, {
//       params: {
//         fields: 'impressions,clicks,spend,reach,ctr,cpm,frequency',
//         access_token: accessToken,
//         date_preset: 'lifetime'
//       }
//     });

//     const insights = insightsResponse.data.data[0] || {};

//     res.json({
//       success: true,
//       data: {
//         campaign,
//         insights
//       }
//     });
//   } catch (error) {
//     console.error('Get insights error:', error.response?.data || error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch campaign insights',
//       error: error.response?.data?.error?.message || error.message
//     });
//   }
// }
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

    const campaign = await AdCampaign.findOne({ 
      userId, 
      campaignId: campaignId
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const { accessToken } = user.integrations.metaAds;

    // Verify campaign exists on Facebook
    try {
      await axios.get(`${FACEBOOK_GRAPH_URL}/${campaignId}`, {
        params: { access_token: accessToken }
      });
    } catch (fbError) {
      return res.status(400).json({
        success: false,
        message: 'Campaign not found on Facebook or access denied',
        error: fbError.response?.data?.error?.message
      });
    }

    // Option 1: Using date_preset
    const insightsResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/${campaignId}/insights`, {
      params: {
        fields: 'impressions,clicks,spend,reach,ctr,cpm,frequency',
        access_token: accessToken,
        date_preset: 'last_30d' // Valid values: today, yesterday, this_month, last_month, this_quarter, maximum, last_3d, last_7d, last_14d, last_28d, last_30d, last_90d
      }
    });

    // Option 2: Using time_range (alternative approach)
    /*
    const insightsResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/${campaignId}/insights`, {
      params: {
        fields: 'impressions,clicks,spend,reach,ctr,cpm,frequency',
        access_token: accessToken,
        time_range: {
          'since': '2024-01-01',
          'until': '2024-12-31'
        }
      }
    });
    */

    const insights = insightsResponse.data.data[0] || {};

    res.json({
      success: true,
      data: {
        campaign,
        insights
      }
    });
  } catch (error) {
    console.error('Get insights error:', error.response?.data || error);
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

      if (!accessToken) {
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