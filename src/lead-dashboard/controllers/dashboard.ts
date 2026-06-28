import { Request, Response } from "express";
import Joi from "joi";
import { unauthorizedResponse, parameterMissingResponse, successResponse } from "../../services/response";
import getLeadsModel from "../schemas/leads";
import getMonthlyTargetsModel from "../schemas/monthly-targets";
import getMonthlyAchievementsModel from "../schemas/monthly-achievements";
import getSalesRepsModel from "../schemas/sales-reps";
import getIncentiveSlabsModel from "../schemas/incentive-slabs";

const OPEN_STATUSES = ['New Lead', 'Contacted', 'Demo Scheduled', 'Demo Done', 'Interested', 'Negotiation'];
const ALL_STATUSES = [...OPEN_STATUSES, 'Closed Won', 'Closed Lost'];
const METRIC_KEYS = ['clinic_onboard', 'banner_sales', 'software_sales', 'appointment_booking', 'website_development'] as const;

type MetricKey = typeof METRIC_KEYS[number];

interface LeadDoc {
    _id: any;
    status: string;
    interest_level: string;
    next_follow_up_date: string;
    expected_value: number;
    assigned_to: any;
    updated_at: Date;
}

interface RepDoc {
    _id: any;
    name: string;
    region: string;
    role: string;
    is_active: boolean;
}

interface TargetDoc {
    rep_id: any;
    metrics: Record<MetricKey, number>;
}

interface AchievementDoc {
    rep_id: any;
    metrics: Record<MetricKey, number>;
}

interface SlabDoc {
    min_percent: number;
    max_percent: number | null;
    amount: number;
}

const schema = {
    summary: Joi.object({
        month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
    }),
};

function computeIncentive(score: number, slabs: SlabDoc[]): number {
    for (const slab of slabs) {
        const withinMin = score >= slab.min_percent;
        const withinMax = slab.max_percent === null || score <= slab.max_percent;
        if (withinMin && withinMax) return slab.amount;
    }
    return 0;
}

const dashboardController = {
    summary: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.summary.validate(req.query);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const branch_id = tokenInfo.bid;
        const month = req.query.month as string;
        const today = new Date().toISOString().slice(0, 10);

        const LeadsModel = getLeadsModel();
        const RepsModel = getSalesRepsModel();
        const TargetsModel = getMonthlyTargetsModel();
        const AchievementsModel = getMonthlyAchievementsModel();
        const SlabsModel = getIncentiveSlabsModel();

        const [allLeads, activeReps, targets, achievements, slabs] = await Promise.all([
            LeadsModel.find({ branch_id }).lean() as Promise<LeadDoc[]>,
            RepsModel.find({ branch_id, is_active: true }).lean() as Promise<RepDoc[]>,
            TargetsModel.find({ branch_id, month }).lean() as Promise<TargetDoc[]>,
            AchievementsModel.find({ branch_id, month }).lean() as Promise<AchievementDoc[]>,
            SlabsModel.find({ branch_id }).sort({ min_percent: 1 }).lean() as Promise<SlabDoc[]>,
        ]);

        // Lead funnel — counts per status
        const funnel: Record<string, number> = {};
        for (const s of ALL_STATUSES) funnel[s] = 0;
        for (const lead of allLeads) {
            if (funnel[lead.status] !== undefined) funnel[lead.status]++;
        }

        // Open pipeline value
        const pipelineValue = allLeads
            .filter((l: LeadDoc) => OPEN_STATUSES.includes(l.status))
            .reduce((sum: number, l: LeadDoc) => sum + (l.expected_value || 0), 0);

        // Closed won this month
        const monthStart = `${month}-01`;
        const monthEnd = `${month}-31`;
        const closedWonThisMonth = allLeads.filter(
            (l: LeadDoc) => l.status === 'Closed Won' && l.updated_at >= new Date(monthStart) && l.updated_at <= new Date(monthEnd)
        );

        // Follow-ups
        const todayFollowUps = allLeads.filter(
            (l: LeadDoc) => l.next_follow_up_date === today && OPEN_STATUSES.includes(l.status)
        ).length;
        const overdueFollowUps = allLeads.filter(
            (l: LeadDoc) => l.next_follow_up_date && l.next_follow_up_date < today && l.next_follow_up_date !== '' && OPEN_STATUSES.includes(l.status)
        ).length;
        const hotLeads = allLeads.filter((l: LeadDoc) => l.interest_level === 'Hot' && OPEN_STATUSES.includes(l.status)).length;

        // Per-rep performance
        const repPerformance = activeReps.map((rep: RepDoc) => {
            const repIdStr = rep._id.toString();
            const target = targets.find((t: TargetDoc) => t.rep_id.toString() === repIdStr);
            const achievement = achievements.find((a: AchievementDoc) => a.rep_id.toString() === repIdStr);

            let totalTargetScore = 0;
            let totalAchievedScore = 0;

            for (const key of METRIC_KEYS) {
                totalTargetScore += target?.metrics?.[key] ?? 0;
                totalAchievedScore += achievement?.metrics?.[key] ?? 0;
            }

            const scorePercent = totalTargetScore > 0 ? Math.round((totalAchievedScore / totalTargetScore) * 100) : 0;
            const incentive = computeIncentive(scorePercent, slabs);

            const repLeads = allLeads.filter((l: LeadDoc) => l.assigned_to?.toString() === repIdStr);
            const repTodayFollowUps = repLeads.filter((l: LeadDoc) => l.next_follow_up_date === today && OPEN_STATUSES.includes(l.status)).length;
            const repOverdue = repLeads.filter((l: LeadDoc) => l.next_follow_up_date && l.next_follow_up_date < today && l.next_follow_up_date !== '' && OPEN_STATUSES.includes(l.status)).length;

            return {
                rep_id: rep._id,
                name: rep.name,
                region: rep.region,
                role: rep.role,
                score_percent: scorePercent,
                incentive,
                leads_assigned: repLeads.length,
                open_leads: repLeads.filter((l: LeadDoc) => OPEN_STATUSES.includes(l.status)).length,
                closed_won: repLeads.filter((l: LeadDoc) => l.status === 'Closed Won').length,
                today_follow_ups: repTodayFollowUps,
                overdue_follow_ups: repOverdue,
            };
        }).sort((a: { score_percent: number }, b: { score_percent: number }) => b.score_percent - a.score_percent);

        const response = successResponse({
            funnel,
            total_leads: allLeads.length,
            pipeline_value: pipelineValue,
            hot_leads: hotLeads,
            today_follow_ups: todayFollowUps,
            overdue_follow_ups: overdueFollowUps,
            closed_won_this_month: {
                count: closedWonThisMonth.length,
                value: closedWonThisMonth.reduce((s: number, l: LeadDoc) => s + (l.expected_value || 0), 0),
            },
            rep_performance: repPerformance,
            active_reps: activeReps.length,
            month,
        }, "Dashboard summary fetched successfully");

        res.status(response.code).json(response);
    },
};

export default dashboardController;
