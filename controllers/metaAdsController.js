// controllers/metaAdsController.js
const axios = require('axios');
const User = require('../models/User');
const AdCampaign = require('../models/AdCampaign');

class MetaAdsController {
  // Connect Facebook/Meta account
  static async connectFacebook(req, res) {
    try {
      const { userId } = req.body;
      const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
      
      const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
        `client_id=${process.env.FACEBOOK_APP_ID}&` +
        `redirect_uri=${encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI)}&` +
        `state=${state}&` +
        `scope=ads_management,ads_read,business_management,pages_show_list,pages_read_engagement,attribution_read,public_profile`;

      res.json({
        success: true,
        authUrl,
        message: 'Redirect user to this URL for Facebook authentication'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate Facebook auth URL',
        error: error.message
      });
    }
  }

  // Handle Facebook OAuth callback
  static async handleFacebookCallback(req, res) {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Authorization code is required'
        });
      }

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

      const { access_token, expires_in } = tokenResponse.data;

      // Get user info
      const userInfoResponse = await axios.get(`https://graph.facebook.com/v19.0/me`, {
        params: {
          fields: 'id,name,email',
          access_token
        }
      });

      // Get user's ad accounts
      const adAccountsResponse = await axios.get(`https://graph.facebook.com/v19.0/me/adaccounts`, {
        params: {
          fields: 'id,name,account_status,currency,timezone_name',
          access_token
        }
      });

      const adAccounts = adAccountsResponse.data.data;
      const primaryAdAccount = adAccounts.find(acc => acc.account_status === 1) || adAccounts[0];

      if (!primaryAdAccount) {
        return res.status(400).json({
          success: false,
          message: 'No active ad account found'
        });
      }

      // Get user's pages
      const pagesResponse = await axios.get(`https://graph.facebook.com/v19.0/me/accounts`, {
        params: {
          access_token
        }
      });

      const pages = pagesResponse.data.data;
      const primaryPage = pages[0];

      // Update user with Meta Ads integration
      const tokenExpiry = new Date(Date.now() + (expires_in * 1000));
      
      await User.findByIdAndUpdate(userId, {
        $set: {
          'integrations.metaAds': {
            isConnected: true,
            adAccountId: primaryAdAccount.id,
            accessToken: access_token,
            tokenExpiry,
            pageId: primaryPage?.id || null,
            businessId: userInfoResponse.data.id
          }
        }
      });

      res.json({
        success: true,
        message: 'Facebook/Meta account connected successfully',
        data: {
          adAccount: primaryAdAccount,
          page: primaryPage,
          userInfo: userInfoResponse.data
        }
      });
    } catch (error) {
      console.error('Facebook callback error:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to connect Facebook account',
        error: error.response?.data?.error?.message || error.message
      });
    }
  }

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

  // Create ad campaign
  static async createCampaign(req, res) {
    try {
      const { userId } = req.params;
      const {
        campaignName,
        objective,
        budget,
        targeting,
        creative
      } = req.body;

      const user = await User.findById(userId);
      if (!user?.integrations?.metaAds?.isConnected) {
        return res.status(400).json({
          success: false,
          message: 'Meta Ads not connected'
        });
      }

      const { accessToken, adAccountId } = user.integrations.metaAds;

      // Create campaign
      const campaignResponse = await axios.post(`https://graph.facebook.com/v19.0/${adAccountId}/campaigns`, {
        name: campaignName,
        objective: objective || 'REACH',
        status: 'PAUSED',
        access_token: accessToken
      });

      const campaignId = campaignResponse.data.id;

      // Create ad set
      const adSetResponse = await axios.post(`https://graph.facebook.com/v19.0/${adAccountId}/adsets`, {
        name: `${campaignName} - Ad Set`,
        campaign_id: campaignId,
        daily_budget: budget.amount * 100, // Convert to cents
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'REACH',
        targeting: {
          age_min: targeting.ageMin || 18,
          age_max: targeting.ageMax || 65,
          genders: targeting.genders || [1, 2],
          geo_locations: {
            countries: targeting.locations || ['US']
          },
          interests: targeting.interests?.map(interest => ({ name: interest })) || []
        },
        status: 'PAUSED',
        access_token: accessToken
      });

      const adSetId = adSetResponse.data.id;

      // Create ad creative
      const adCreativeResponse = await axios.post(`https://graph.facebook.com/v19.0/${adAccountId}/adcreatives`, {
        name: `${campaignName} - Creative`,
        object_story_spec: {
          page_id: user.integrations.metaAds.pageId,
          link_data: {
            image_url: creative.imageUrl,
            link: creative.destinationUrl || '#',
            message: creative.description,
            name: creative.headline,
            call_to_action: {
              type: creative.callToAction || 'LEARN_MORE'
            }
          }
        },
        access_token: accessToken
      });

      const adCreativeId = adCreativeResponse.data.id;

      // Create ad
      const adResponse = await axios.post(`https://graph.facebook.com/v19.0/${adAccountId}/ads`, {
        name: `${campaignName} - Ad`,
        adset_id: adSetId,
        creative: { creative_id: adCreativeId },
        status: 'PAUSED',
        access_token: accessToken
      });

      const adId = adResponse.data.id;

      // Save campaign to database
      const campaign = new AdCampaign({
        userId,
        campaignId,
        adSetId,
        adId,
        campaignName,
        objective,
        budget,
        targeting,
        creative,
        status: 'DRAFT'
      });

      await campaign.save();

      res.json({
        success: true,
        message: 'Campaign created successfully',
        data: {
          campaignId,
          adSetId,
          adId,
          campaign
        }
      });
    } catch (error) {
      console.error('Create campaign error:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to create campaign',
        error: error.response?.data?.error?.message || error.message
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