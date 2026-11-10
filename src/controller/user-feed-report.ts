import { Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import { internalServerError, parameterMissingResponse, successResponse, unauthorizedResponse } from '../services/response';
import { userFeedDoctorModel } from '../mongo-schema/coll_user_feed_doctors';

const reqSchema = {
    getClinicUserFeed: Joi.object({
        clinic_id: Joi.number().required(),
        doctor_id: Joi.number().allow(''),
        from_date: Joi.string().required(),
        to_date: Joi.string().required(),
    })
};

/* every stage counts DISTINCT users: with "All doctors" one user can hold two of the clinic's
   doctors, and counting documents would then say more users viewed than there are users.
   a document that does not qualify adds null to the set, which is dropped when sized */
const userIf = (condition: any) => ({ $addToSet: { $cond: [condition, "$user_id", null] } });
const countStages = {
    users: { $addToSet: "$user_id" },
    viewed: userIf({ $gt: ["$views", 0] }),
    contacted: userIf({ $gt: ["$actions", 0] }),
    booked: userIf({ $gt: ["$bookings", 0] }),
    from_search: userIf({ $gt: ["$cat_id", 0] }),
    hidden: userIf({ $eq: ["$hidden", true] }),
};
const sized = (field: string) => ({ $size: { $setDifference: [`$${field}`, [null]] } });
const projectCounts = {
    users: { $size: "$users" },
    viewed: sized("viewed"),
    contacted: sized("contacted"),
    booked: sized("booked"),
    from_search: sized("from_search"),
    hidden: sized("hidden"),
};

const userFeedReportController = {
    /**
     * How many users carry this clinic's doctors in their personalised feed (careipro.com, logged
     * in users only), and how far they went: viewed, contacted, booked, hid. The feed is per user
     * and doctor, not per clinic, so a clinic is reported through its doctors: a doctor who also
     * sits at another clinic counts fully here.
     *
     * Totals are the feed as it stands now. The date range only drives "new in period" and the
     * trend, both read from first_at, the day a user first got the doctor in their feed.
     */
    getClinicUserFeed: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            return unauthorizedResponse("Something went wrong", res);
        }
        const { query }: { query: any } = req;
        const validation: ValidationResult = reqSchema.getClinicUserFeed.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const clinic_id = parseInt(query.clinic_id);
        const doctor_id = parseInt(query.doctor_id || "0");
        try {
            const clinicDoctors = await DB.get_rows<{ doctor_id: number, doctor_name: string }>(
                "select distinct dsl.doctor_id,doctor.name as doctor_name from doctor_service_location as dsl join doctor on dsl.doctor_id=doctor.id where dsl.clinic_id=?",
                [clinic_id]
            );
            const doctorIds = clinicDoctors.map((d) => Number(d.doctor_id)).filter((id) => doctor_id === 0 || id === doctor_id);
            const empty = { totals: { users: 0, viewed: 0, contacted: 0, booked: 0, from_search: 0, hidden: 0, new_in_period: 0 }, day_wise: [], doctors: [], categories: [] };
            if (doctorIds.length === 0) {
                res.json(successResponse(empty));
                return;
            }
            // dates are picked in IST, first_at is stored in UTC
            const from = new Date(`${query.from_date}T00:00:00+05:30`);
            const to = new Date(`${query.to_date}T23:59:59+05:30`);

            const [result] = await userFeedDoctorModel.aggregate([
                { $match: { doctor_id: { $in: doctorIds } } },
                {
                    $facet: {
                        totals: [
                            { $group: { _id: null, ...countStages, new_in_period: userIf({ $and: [{ $gte: ["$first_at", from] }, { $lte: ["$first_at", to] }] }) } },
                            { $project: { _id: 0, ...projectCounts, new_in_period: sized("new_in_period") } }
                        ],
                        doctors: [
                            { $group: { _id: "$doctor_id", ...countStages } },
                            { $project: { _id: 0, doctor_id: "$_id", ...projectCounts } },
                            { $sort: { users: -1 } }
                        ],
                        day_wise: [
                            { $match: { first_at: { $gte: from, $lte: to } } },
                            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$first_at", timezone: "+05:30" } }, new_users: { $addToSet: "$user_id" } } },
                            { $project: { _id: 0, date: "$_id", new_users: { $size: "$new_users" } } },
                            { $sort: { date: 1 } }
                        ],
                        categories: [
                            { $match: { cat_id: { $gt: 0 } } },
                            { $group: { _id: "$cat_id", users: { $addToSet: "$user_id" } } },
                            { $project: { _id: 0, cat_id: "$_id", users: { $size: "$users" } } },
                            { $sort: { users: -1 } },
                            { $limit: 15 }
                        ]
                    }
                }
            ]);

            const nameById: Record<number, string> = {};
            for (const d of clinicDoctors) nameById[Number(d.doctor_id)] = d.doctor_name;
            const catIds: number[] = (result?.categories || []).map((c: any) => Number(c.cat_id));
            const catRows = catIds.length
                ? await DB.get_rows<{ id: number, name: string }>("select id,name from specialists where id in (?)", [catIds.map(String)])
                : [];
            const catName: Record<number, string> = {};
            for (const c of catRows) catName[Number(c.id)] = c.name;

            res.json(successResponse({
                totals: result?.totals?.[0] || empty.totals,
                day_wise: result?.day_wise || [],
                doctors: (result?.doctors || []).map((d: any) => ({ ...d, doctor_name: nameById[d.doctor_id] || `Doctor #${d.doctor_id}` })),
                categories: (result?.categories || []).map((c: any) => ({ ...c, name: catName[Number(c.cat_id)] || `Category #${c.cat_id}` })),
            }));
        } catch (err: any) {
            internalServerError(err.message, res);
        }
    }
}
export default userFeedReportController;
