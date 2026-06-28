import { Types } from "mongoose";
import { successResponse, serviceNotAcceptable } from "../../services/response";
import getFollowUpLogsModel from "../schemas/follow-up-logs";
import getLeadsModel from "../schemas/leads";

const followUpModel = {
    log: async (params: {
        lead_id: string;
        contact_date: string;
        contacted_by: string;
        status_after: string;
        notes?: string;
        next_follow_up_date?: string;
        reminder_note?: string;
    }) => {
        const FollowUpLogsModel = getFollowUpLogsModel();
        const LeadsModel = getLeadsModel();

        const lead = await LeadsModel.findById(new Types.ObjectId(params.lead_id)).select('assigned_to').lean() as any;
        if (!lead) return serviceNotAcceptable("Lead not found");

        await new FollowUpLogsModel({
            lead_id: new Types.ObjectId(params.lead_id),
            contact_date: params.contact_date,
            contacted_by: new Types.ObjectId(params.contacted_by),
            // Snapshot who the lead was assigned to at the time of this follow-up
            assigned_to: lead.assigned_to || null,
            status_after: params.status_after,
            notes: params.notes || '',
            next_follow_up_date: params.next_follow_up_date || '',
            reminder_note: params.reminder_note || '',
            created_at: new Date(),
        }).save();

        // Update the lead's last contact date, next follow-up date, and status
        const leadUpdate: any = {
            status: params.status_after,
            last_contact_date: params.contact_date,
            updated_at: new Date(),
        };
        if (params.next_follow_up_date) leadUpdate.next_follow_up_date = params.next_follow_up_date;

        await LeadsModel.findByIdAndUpdate(new Types.ObjectId(params.lead_id), { $set: leadUpdate });

        return successResponse({}, "Follow-up logged successfully");
    },

    history: async (params: { lead_id: string }) => {
        const FollowUpLogsModel = getFollowUpLogsModel();
        const logs = await FollowUpLogsModel.find({ lead_id: new Types.ObjectId(params.lead_id) })
            .populate('contacted_by', 'name')
            .populate('assigned_to', 'name')
            .sort({ contact_date: -1, created_at: -1 })
            .lean();
        return successResponse(logs, "Follow-up history fetched successfully");
    },

    rate: async (params: { log_id: string; rating: number; rating_comment?: string; rated_by: string }) => {
        const FollowUpLogsModel = getFollowUpLogsModel();
        const result = await FollowUpLogsModel.findByIdAndUpdate(
            new Types.ObjectId(params.log_id),
            { $set: { rating: params.rating, rating_comment: params.rating_comment || '', rated_by: new Types.ObjectId(params.rated_by), rated_at: new Date() } }
        );
        if (!result) return serviceNotAcceptable("Follow-up log not found");
        return successResponse({}, "Rating saved successfully");
    },

    todayAndOverdue: async (params: { branch_id: number; today: string }) => {
        const LeadsModel = getLeadsModel();
        const openStatuses = ['New Lead', 'Contacted', 'Demo Scheduled', 'Demo Done', 'Interested', 'Negotiation'];

        const [today, overdue] = await Promise.all([
            LeadsModel.find({
                branch_id: params.branch_id,
                next_follow_up_date: params.today,
                status: { $in: openStatuses },
            }).populate('assigned_to', 'name').lean(),
            LeadsModel.find({
                branch_id: params.branch_id,
                next_follow_up_date: { $lt: params.today, $ne: '' },
                status: { $in: openStatuses },
            }).populate('assigned_to', 'name').sort({ next_follow_up_date: 1 }).lean(),
        ]);

        return successResponse({ today, overdue }, "Follow-ups fetched successfully");
    },
};

export default followUpModel;
