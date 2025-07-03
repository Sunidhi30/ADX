const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');

const {
  FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET,
  FACEBOOK_REDIRECT_URI
} = process.env;

// Step 1: Redirect user to Facebook OAuth
router.get('/connect', (req, res) => {
  const state = req.query.userId;
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${FACEBOOK_REDIRECT_URI}&state=${state}&scope=pages_show_list,pages_read_engagement`;
  res.redirect(authUrl);
});

// Step 2: Callback from Facebook after login
router.get('/callback', async (req, res) => {
  const { code, state: userId } = req.query;

  try {
    // Get user access token
    const tokenRes = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
      params: {
        client_id: FACEBOOK_APP_ID,
        redirect_uri: FACEBOOK_REDIRECT_URI,
        client_secret: FACEBOOK_APP_SECRET,
        code
      }
    });

    const userAccessToken = tokenRes.data.access_token;

    // Get user's pages
    const pagesRes = await axios.get(`https://graph.facebook.com/v19.0/me/accounts`, {
      params: {
        access_token: userAccessToken
      }
    });

    const pages = pagesRes.data.data;
    if (!pages.length) return res.status(400).send("No Facebook Pages found.");

    const page = pages[0];
    const pageId = page.id;
    const pageAccessToken = page.access_token;

    await User.findByIdAndUpdate(userId, {
      $set: {
        'integrations.metaAds': {
          isConnected: true,
          accessToken: pageAccessToken,
          tokenExpiry: null,
          pageId: pageId,
          businessId: null
        }
      }
    });

    res.send("Facebook Page connected successfully!");
  } catch (err) {
    console.error('Facebook callback error:', err.response?.data || err.message);
    res.status(500).send('Facebook connection failed.');
  }
});

// Step 3: Get Facebook Page Followers
router.get('/followers/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const { pageId, accessToken } = user?.integrations?.metaAds || {};

    if (!pageId || !accessToken) {
      return res.status(400).json({ error: 'Facebook Page not connected' });
    }

    const pageRes = await axios.get(`https://graph.facebook.com/v19.0/${pageId}`, {
      params: {
        fields: 'followers_count',
        access_token: accessToken
      }
    });

    const followers = pageRes.data?.followers_count;
    if (followers === undefined) {
      return res.status(400).json({ error: 'followers_count not available. Make sure the page is published and has followers.' });
    }

    res.json({ followers });
  } catch (err) {
    console.error('Error getting followers:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || 'Failed to fetch followers' });
  }
});

module.exports = router;
