// // controllers/leadController.js
const Lead = require('../models/Lead');
const AdCampaign = require('../models/AdCampaign');
const { Parser } = require('json2csv');
class LeadController {

  // Handle Facebook Lead Webhook
  static async handleFacebookWebhook(req, res) {
    try {
      const { entry } = req.body;

      for (const e of entry) {
        for (const change of e.changes) {
          if (change.value.form_id) {
            // Find the associated ad campaign
            const adCampaign = await AdCampaign.findOne({
              'meta.formId': change.value.form_id
            });

            if (!adCampaign) {
              console.error('No campaign found for form:', change.value.form_id);
              continue;
            }

            const lead = new Lead({
              userId: adCampaign.userId,
              adCampaignId: adCampaign._id,
              source: 'facebook_ads',
              platformAdId: change.value.ad_id,
              contactInfo: {
                name: change.value.full_name,
                email: change.value.email,
                phone: change.value.phone_number
              },
              leadData: {
                formFields: change.value.field_data,
                utmSource: 'facebook',
                utmMedium: 'lead_ad'
              }
            });

            await lead.save();
          }
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Facebook webhook error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get leads for a specific ad campaign
  static async getCampaignLeads(req, res) {
    try {
      const { campaignId } = req.params;
      const leads = await Lead.find({ adCampaignId: campaignId })
        .populate('assignedTo', 'name email')
        .sort('-createdAt');

      res.json({
        success: true,
        count: leads.length,
        data: leads
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update lead status or add notes
  static async updateLead(req, res) {
    try {
      const { id } = req.params;
      const { status, notes, tags, assignedTo, followUpDate } = req.body;

      const lead = await Lead.findByIdAndUpdate(
        id,
        {
          $set: {
            status,
            notes,
            tags,
            assignedTo,
            followUpDate,
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      res.json({
        success: true,
        data: lead
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Export leads to CSV
  static async exportLeads(req, res) {
    try {
      const { campaignId, startDate, endDate, status } = req.query;

      let query = { adCampaignId: campaignId };
      if (status) query.status = status;
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const leads = await Lead.find(query)
        .populate('assignedTo', 'name email')
        .populate('adCampaignId', 'name platform')
        .lean();

      const fields = [
        'contactInfo.name',
        'contactInfo.email',
        'contactInfo.phone',
        'source',
        'status',
        'tags',
        'notes',
        'followUpDate',
        'conversionValue',
        'createdAt'
      ];

      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(leads);

      res.header('Content-Type', 'text/csv');
      res.attachment(`leads-${campaignId}.csv`);
      return res.send(csv);

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = LeadController;