const axios = require('axios');
const { google } = require('googleapis');
const User = require('../models/User');
const AdCampaign = require('../models/AdCampaign');
require('dotenv').config();

const GOOGLE_REDIRECT_URI = 'http://localhost:9000/api/google-ads/callback';
const SCOPES = [
  'https://www.googleapis.com/auth/adwords',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

class GoogleAdsController {
  static getOAuth2Client() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );
  }

  static async connectGoogle(req, res) {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          error: 'userId is required' 
        });
      }

      const oauth2Client = GoogleAdsController.getOAuth2Client();
      
      // Create state parameter with userId
      const stateParam = {
        userId: userId,
        timestamp: Date.now()
      };

      const state = Buffer.from(JSON.stringify(stateParam)).toString('base64');
      
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        state: state,
        prompt: 'consent'
      });

      res.json({ 
        success: true, 
        authUrl,
        debug: {
          state: state,
          userId: userId
        }
      });
    } catch (error) {
      console.error('Connect Google error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  static async handleGoogleCallback(req, res) {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters'
        });
      }

      // Decode state parameter
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
      const { userId } = decodedState;

      const oauth2Client = GoogleAdsController.getOAuth2Client();
      
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Get user info
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      // Get Google Ads customer ID
      // Note: You'll need to implement this based on your needs
      const customerIds = await GoogleAdsController.getCustomerIds(oauth2Client);
      const customerId = customerIds[0]; // Use first account or implement selection logic

      // Update user with Google Ads integration details
      await User.findByIdAndUpdate(userId, {
        'integrations.googleAds': {
          isConnected: true,
          customerId: customerId,
          refreshToken: tokens.refresh_token,
          accessToken: tokens.access_token,
          tokenExpiry: new Date(tokens.expiry_date)
        }
      });

      res.json({
        success: true,
        message: 'Google Ads successfully connected',
        data: {
          customerId,
          userInfo: userInfo.data,
          tokenExpiry: new Date(tokens.expiry_date)
        }
      });

    } catch (error) {
      console.error('Google callback error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getCustomerIds(oauth2Client) {
    // This is a placeholder - you'll need to implement this using the Google Ads API
    // Here's where you'd query the CustomerService to get available accounts
    return ['1234567890']; // Replace with actual implementation
  }

  static async getCampaigns(req, res) {
    try {
      const { userId } = req.params;
      
      const user = await User.findById(userId);
      if (!user?.integrations?.googleAds?.isConnected) {
        return res.status(400).json({
          success: false,
          message: 'Google Ads not connected'
        });
      }

      const oauth2Client = GoogleAdsController.getOAuth2Client();
      oauth2Client.setCredentials({
        access_token: user.integrations.googleAds.accessToken,
        refresh_token: user.integrations.googleAds.refreshToken
      });

      // Implement Google Ads API call to get campaigns
      // This is where you'd use the Google Ads API library

      res.json({
        success: true,
        data: [] // Replace with actual campaigns data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch campaigns',
        error: error.message
      });
    }
  }

  // Add more methods for creating campaigns, getting insights, etc.
}

module.exports = GoogleAdsController;