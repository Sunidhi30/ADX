
const express = require('express');
const router = express.Router();
const MetaAdsController = require('../controllers/metaAdsController');

// Define routes
router.post('/connect', MetaAdsController.connectFacebook);
router.get('/callback', MetaAdsController.handleFacebookCallback);
router.get('/adaccounts/:userId', MetaAdsController.getAdAccounts);
router.post('/campaigns/:userId', MetaAdsController.createCampaign);
router.get('/campaigns/:userId', MetaAdsController.getCampaigns);
router.put('/campaigns/:userId/:campaignId/status', MetaAdsController.updateCampaignStatus);
router.get('/campaigns/:userId/:campaignId/insights', MetaAdsController.getCampaignInsights);
router.delete('/campaigns/:userId/:campaignId', MetaAdsController.deleteCampaign);
router.get('/page/followers/:userId', MetaAdsController.getPageFollowers);
router.put('/campaigns/:id/schedule', MetaAdsController.scheduleCampaign);
router.get('/campaigns/user/:userId',  MetaAdsController.getUserCampaigns);
router.get('/campaigns/:id/analytics', MetaAdsController. getCampaignAnalytics);

module.exports = router;
