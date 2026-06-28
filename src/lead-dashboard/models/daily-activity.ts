import { Types } from "mongoose";
import { successResponse } from "../../services/response";
import getDailyActivitiesModel from "../schemas/daily-activities";

const dailyActivityModel = {
    log: async (params: {
        branch_id: number;
        rep_id: string;
        date: string;
        visits_done: number;
        calls_made: number;
        demos_given: number;
        closures: number;
        remarks?: string;
    }) => {
        const DailyActivitiesModel = getDailyActivitiesModel();
        const now = new Date();

        await DailyActivitiesModel.findOneAndUpdate(
            { rep_id: new Types.ObjectId(params.rep_id), date: params.date },
            {
                $set: {
                    branch_id: params.branch_id,
                    visits_done: params.visits_done,
                    calls_made: params.calls_made,
                    demos_given: params.demos_given,
                    closures: params.closures,
                    remarks: params.remarks || '',
                    updated_at: now,
                },
                $setOnInsert: { created_at: now },
            },
            { upsert: true, new: true }
        );
        return successResponse({}, "Daily activity logged successfully");
    },

    list: async (params: {
        branch_id: number;
        rep_id?: string;
        date_from?: string;
        date_to?: string;
    }) => {
        const DailyActivitiesModel = getDailyActivitiesModel();
        const filter: any = { branch_id: params.branch_id };

        if (params.rep_id) filter.rep_id = new Types.ObjectId(params.rep_id);
        if (params.date_from || params.date_to) {
            filter.date = {};
            if (params.date_from) filter.date.$gte = params.date_from;
            if (params.date_to) filter.date.$lte = params.date_to;
        }

        const activities = await DailyActivitiesModel.find(filter)
            .populate('rep_id', 'name region')
            .sort({ date: -1 })
            .lean();

        return successResponse(activities, "Daily activities fetched successfully");
    },
};

export default dailyActivityModel;
