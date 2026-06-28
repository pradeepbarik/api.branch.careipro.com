import { Types } from "mongoose";
import { successResponse } from "../../services/response";
import getMonthlyTargetsModel from "../schemas/monthly-targets";
import getMonthlyAchievementsModel from "../schemas/monthly-achievements";

const METRIC_KEYS = ['clinic_onboard', 'banner_sales', 'software_sales', 'appointment_booking', 'website_development'] as const;

const targetsModel = {
    setTarget: async (params: {
        branch_id: number;
        rep_id: string;
        month: string;
        metrics: Record<string, number>;
    }) => {
        const TargetsModel = getMonthlyTargetsModel();
        const now = new Date();
        const metrics: any = {};
        for (const key of METRIC_KEYS) metrics[key] = params.metrics[key] ?? 0;

        await TargetsModel.findOneAndUpdate(
            { rep_id: new Types.ObjectId(params.rep_id), month: params.month },
            { $set: { branch_id: params.branch_id, metrics, updated_at: now }, $setOnInsert: { created_at: now } },
            { upsert: true, new: true }
        );
        return successResponse({}, "Target set successfully");
    },

    getTargets: async (params: { branch_id: number; month: string; rep_id?: string }) => {
        const TargetsModel = getMonthlyTargetsModel();
        const filter: any = { branch_id: params.branch_id, month: params.month };
        if (params.rep_id) filter.rep_id = new Types.ObjectId(params.rep_id);

        const targets = await TargetsModel.find(filter)
            .populate('rep_id', 'name region role')
            .lean();
        return successResponse(targets, "Targets fetched successfully");
    },

    setAchievement: async (params: {
        branch_id: number;
        rep_id: string;
        month: string;
        metrics: Record<string, number>;
    }) => {
        const AchievementsModel = getMonthlyAchievementsModel();
        const now = new Date();
        const metrics: any = {};
        for (const key of METRIC_KEYS) metrics[key] = params.metrics[key] ?? 0;

        await AchievementsModel.findOneAndUpdate(
            { rep_id: new Types.ObjectId(params.rep_id), month: params.month },
            { $set: { branch_id: params.branch_id, metrics, updated_at: now }, $setOnInsert: { created_at: now } },
            { upsert: true, new: true }
        );
        return successResponse({}, "Achievement set successfully");
    },

    getAchievements: async (params: { branch_id: number; month: string; rep_id?: string }) => {
        const AchievementsModel = getMonthlyAchievementsModel();
        const filter: any = { branch_id: params.branch_id, month: params.month };
        if (params.rep_id) filter.rep_id = new Types.ObjectId(params.rep_id);

        const achievements = await AchievementsModel.find(filter)
            .populate('rep_id', 'name region role')
            .lean();
        return successResponse(achievements, "Achievements fetched successfully");
    },
};

export default targetsModel;
